import "server-only";

import { db, type UserRole } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";

/**
 * Local `users` row primitives, shared by the operator path (`@/auth/provision`)
 * and the network-reachable self-signup path (`@/auth`).
 *
 * THIS MODULE MUST NEVER IMPORT SUPABASE. Not the anon client, and above all not
 * `@/lib/supabase.admin` — self-signup reaches this code from a "use server"
 * module, and a service-role import anywhere in that graph is exactly what the
 * audit exists to prevent:
 *
 *   grep -rE "^\s*import .*(supabase\.admin|auth/provision)" src/app src/auth/localUser.ts
 *
 * The two callers deliberately do NOT share one "upsert" function. They need
 * different policy: the operator may overwrite an existing row's role and name
 * because they typed the command themselves; self-signup may do neither.
 * What they share is normalisation — which is where the real bugs live.
 */

export type UserRow = {
  id: string;
  role: UserRole;
  email: string | null;
  firstName: string;
  lastName: string;
};

/**
 * Emails are stored lowercase. `loginTeacher` and `requestPasswordReset` both
 * query with a lowercased value and `users.email` is byte-exact UNIQUE, so any
 * writer that skips this silently breaks login.
 */
export function normalizeEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

export function defaultUsernameFor(email: string): string {
  return normalizeEmail(email);
}

/** Names are user-supplied and end up in the UI. Trim and bound them. */
export function normalizeName(raw: unknown, fallback = ""): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim().slice(0, 80);
  return trimmed || fallback;
}

export async function findUserRowByEmail(email: string): Promise<UserRow | null> {
  const row = await db
    .selectFrom("users")
    .select(["id", "role", "email", "firstName", "lastName"])
    .where("email", "=", normalizeEmail(email))
    .executeTakeFirst();

  return row ?? null;
}

/**
 * Insert a teacher/admin row.
 *
 * `id` is REQUIRED and must be the Supabase `auth.users.id`. That equality is
 * the whole auth model: there is no separate link column, so a teacher's local
 * row and their Supabase user cannot drift apart or point at each other wrongly.
 */
export async function insertTeacherRow(input: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  role?: "TEACHER" | "ADMIN";
}): Promise<{ userId: string }> {
  const now = nowIso();
  const email = normalizeEmail(input.email);

  const values = {
    id: input.id,
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role ?? "TEACHER",
    createdAt: now,
    updatedAt: now,
  } as const;

  try {
    await db
      .insertInto("users")
      .values({
        ...values,
        username:
          input.username === undefined ? defaultUsernameFor(email) : input.username,
      })
      .execute();
  } catch {
    // `username` is UNIQUE but nullable, and Postgres — like SQLite — treats
    // NULLs as distinct in a unique index. A collision on the derived username
    // must not block account creation; username is no longer a credential.
    await db
      .insertInto("users")
      .values({ ...values, username: null })
      .execute();
  }

  return { userId: input.id };
}

/* -------------------------------------------------------------------------- */
/* Self-signup policy                                                          */
/* -------------------------------------------------------------------------- */

export type AdoptResult =
  | { status: "created" | "already"; userId: string; role: UserRole }
  | { status: "conflict"; reason: "student-row" | "email-taken" };

/**
 * Turn a MAILBOX-VERIFIED Supabase user into a local teacher row.
 *
 * Only ever called after `verifyOtp` has succeeded, so the caller has proved
 * control of the address — the same standard `completePasswordReset` trusts.
 *
 * THIS USED TO BE A SIX-CASE MATRIX. It collapsed when `users.id` became the
 * `auth.users.id` rather than a nullable `supabaseUserId` pointing at a separate
 * system. Three of those cases are now UNREPRESENTABLE rather than merely
 * checked:
 *
 *   - "linked to a DIFFERENT Supabase account" cannot occur: the id IS the link,
 *     so a row either is this user's or belongs to a different id entirely.
 *   - "already linked to this account" is a primary-key conflict, handled by the
 *     database rather than a branch.
 *   - "an unlinked TEACHER row to adopt" cannot exist, because a teacher row is
 *     only ever created with an auth id in hand.
 *
 * That also retired the heal-on-login idea: there is no longer a state where a
 * confirmed Supabase user has no reachable local row.
 */
export async function adoptConfirmedTeacher(input: {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<AdoptResult> {
  const email = normalizeEmail(input.email);

  // Keyed on the auth id, which is now the primary key.
  const own = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("id", "=", input.authUserId)
    .executeTakeFirst();

  if (own) {
    // Idempotent: a double-submitted confirmation lands here.
    return { status: "already", userId: own.id, role: own.role };
  }

  const byEmail = await findUserRowByEmail(email);

  if (byEmail) {
    // Same address, different id. A student sharing a teacher's address would
    // collapse two very different privilege levels onto one row; any other
    // holder means the unique email constraint would reject the insert anyway.
    return {
      status: "conflict",
      reason: byEmail.role === "STUDENT" ? "student-row" : "email-taken",
    };
  }

  const { userId } = await insertTeacherRow({
    id: input.authUserId,
    email,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  return { status: "created", userId, role: "TEACHER" };
}

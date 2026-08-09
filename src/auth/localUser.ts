import "server-only";

import { db, parseUserRole, type UserRole } from "@/db";
import { newId, nowIso } from "@/lib/sqlite";

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
 * different policy: the operator may overwrite a role and re-point a Supabase
 * link because they typed the command themselves; self-signup may do neither.
 * What they share is normalisation — which is where the real bugs live.
 */

export type UserRow = {
  id: string;
  role: string;
  supabaseUserId: string | null;
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
    .select(["id", "role", "supabaseUserId", "email", "firstName", "lastName"])
    .where("email", "=", normalizeEmail(email))
    .executeTakeFirst();

  return row ?? null;
}

export async function insertTeacherRow(input: {
  supabaseUserId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  role?: "TEACHER" | "ADMIN";
}): Promise<{ userId: string }> {
  const now = nowIso();
  const email = normalizeEmail(input.email);
  const userId = newId();

  const values = {
    id: userId,
    supabaseUserId: input.supabaseUserId,
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role ?? "TEACHER",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db
      .insertInto("users")
      .values({
        ...values,
        username: input.username === undefined ? defaultUsernameFor(email) : input.username,
      } as never)
      .execute();
  } catch {
    // `username` is UNIQUE but nullable, and SQLite treats NULLs as distinct.
    // A collision on the derived username must not block account creation —
    // username is no longer a credential, only a display leftover.
    await db
      .insertInto("users")
      .values({ ...values, username: null } as never)
      .execute();
  }

  return { userId };
}

export async function linkSupabaseUserId(
  userId: string,
  supabaseUserId: string,
): Promise<void> {
  await db
    .updateTable("users")
    .set({ supabaseUserId, updatedAt: nowIso() })
    .where("id", "=", userId)
    .execute();
}

/* -------------------------------------------------------------------------- */
/* Self-signup policy                                                          */
/* -------------------------------------------------------------------------- */

export type AdoptResult =
  | { status: "created" | "linked" | "already"; userId: string; role: UserRole }
  | {
      status: "conflict";
      reason: "linked-elsewhere" | "student-row" | "admin-row";
    };

/**
 * Turn a MAILBOX-VERIFIED Supabase user into a local teacher row.
 *
 * Only ever called after `verifyOtp` has succeeded, so the caller has proved
 * control of the address. That is the same standard `completePasswordReset`
 * already trusts.
 *
 * Every refusal below exists because this path is reachable by anyone on the
 * internet. Self-signup must never overwrite a role, re-point an existing
 * Supabase link, or promote a student.
 */
export async function adoptConfirmedTeacher(input: {
  supabaseUserId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<AdoptResult> {
  const email = normalizeEmail(input.email);
  const existing = await findUserRowByEmail(email);

  if (!existing) {
    const { userId } = await insertTeacherRow({
      supabaseUserId: input.supabaseUserId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return { status: "created", userId, role: "TEACHER" };
  }

  if (existing.role === "STUDENT") {
    // A student and a teacher sharing one address would collapse two very
    // different privilege levels onto one row. Never.
    return { status: "conflict", reason: "student-row" };
  }

  if (existing.supabaseUserId === input.supabaseUserId) {
    // Idempotent: a double-submitted confirmation lands here.
    return {
      status: "already",
      userId: existing.id,
      role: parseUserRole(existing.role),
    };
  }

  if (existing.supabaseUserId !== null) {
    // Already bound to a DIFFERENT Supabase account. Re-pointing it from an
    // anonymous path would be an account takeover.
    return { status: "conflict", reason: "linked-elsewhere" };
  }

  if (existing.role === "ADMIN") {
    // Claiming an unlinked ADMIN row from the public form would escalate
    // privilege. Operator territory — use `npm run provision-teacher`.
    return { status: "conflict", reason: "admin-row" };
  }

  // Unlinked TEACHER row: the recovery path for a row created by
  // `provisionTeacher` before Supabase keys were configured. Link it in place
  // and keep its existing role and names.
  await linkSupabaseUserId(existing.id, input.supabaseUserId);
  return {
    status: "linked",
    userId: existing.id,
    role: parseUserRole(existing.role),
  };
}

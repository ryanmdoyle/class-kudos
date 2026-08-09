import "server-only";

import { db } from "@/db";
import { nowIso } from "@/lib/sqlite";
import { createAdminSupabaseClient } from "@/lib/supabase.admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase";
import {
  defaultUsernameFor,
  findUserRowByEmail,
  insertTeacherRow,
  normalizeEmail,
} from "@/auth/localUser";

/**
 * !! OPERATOR-ONLY MODULE — SERVICE ROLE !!
 *
 * This must NEVER become an RSC action. It is deliberately NOT exported from
 * `src/auth/index.ts`, and this file must never be imported by a "use server"
 * module or by anything under `src/app/`. Audit with:
 *
 *   grep -rE "^\\s*import .*(supabase\\.admin|auth/provision)" src/app   # must be empty
 *
 * Call it from a script instead:
 *
 *   npm run seed              # -> src/scripts/seed.ts
 *   npm run worker:run ./src/scripts/seed.ts
 *
 * Teachers can now also self-signup (`signupTeacher` in `@/auth`, which uses the
 * ANON client and is therefore safe to reach from an action). This module stays
 * the operator path: it is the way to create the FIRST account, to create one
 * without an inbox round-trip, and to create an ADMIN — none of which self-signup
 * is permitted to do.
 */

export type ProvisionTeacherInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: "TEACHER" | "ADMIN";
};

export type ProvisionTeacherResult =
  | { ok: true; userId: string; supabaseUserId: string | null; created: boolean }
  | { ok: false; error: string };

/**
 * Create (or re-link) a teacher.
 *
 * When the service-role key is configured this creates the Supabase auth user
 * and stores its id as `users.supabaseUserId`. When it is NOT configured the
 * local row is still created — with `supabaseUserId = null` — so a developer can
 * seed a usable database before wiring up a Supabase project. Such a teacher
 * CANNOT log in (login requires a `supabaseUserId` match); re-run this once the
 * keys are in place and the existing row is linked in place.
 *
 * Idempotent: a local row is matched by email and updated rather than duplicated.
 */
export async function provisionTeacher({
  email,
  password,
  firstName,
  lastName,
  username,
  role = "TEACHER",
}: ProvisionTeacherInput): Promise<ProvisionTeacherResult> {
  // Normalisation lives in @/auth/localUser so the operator path and the
  // self-signup path cannot drift on it — a writer that skips the lowercasing
  // silently breaks login.
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = username
    ? normalizeEmail(username)
    : defaultUsernameFor(normalizedEmail);

  if (!normalizedEmail.includes("@")) {
    return { ok: false, error: `"${email}" is not a valid email address.` };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  let supabaseUserId: string | null = null;

  if (isSupabaseAdminConfigured()) {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      // No inbox round-trip: the operator is creating this account deliberately.
      email_confirm: true,
    });

    if (error || !data?.user) {
      // Operator-facing, not user-facing — being specific here is correct.
      return {
        ok: false,
        error:
          `Supabase could not create ${normalizedEmail}: ${error?.message ?? "unknown error"}. ` +
          `If the account already exists, delete it under Authentication -> Users, ` +
          `or link the existing id manually.`,
      };
    }

    supabaseUserId = data.user.id;
  }

  const now = nowIso();

  const existing = await findUserRowByEmail(normalizedEmail);

  if (existing) {
    await db
      .updateTable("users")
      .set({
        // Never null out an existing link just because the key is missing today.
        supabaseUserId: supabaseUserId ?? existing.supabaseUserId,
        role,
        firstName,
        lastName,
        updatedAt: now,
      })
      .where("id", "=", existing.id)
      .execute();

    return {
      ok: true,
      userId: existing.id,
      supabaseUserId: supabaseUserId ?? existing.supabaseUserId,
      created: false,
    };
  }

  const { userId } = await insertTeacherRow({
    supabaseUserId,
    email: normalizedEmail,
    username: normalizedUsername,
    firstName,
    lastName,
    role,
  });

  return { ok: true, userId, supabaseUserId, created: true };
}

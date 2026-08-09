import "server-only";

import { db } from "@/db";
import { newId, nowIso } from "@/lib/sqlite";
import { createAdminSupabaseClient } from "@/lib/supabase.admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase";

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
 * Self-signup is disabled in the Supabase dashboard (see SUPABASE_SETUP.md), so
 * this is the only way a teacher account comes into existence.
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
  // Emails are stored lowercase. loginTeacher() and requestPasswordReset() both
  // query with a lowercased value, so any writer that skips this silently breaks
  // login.
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = (username ?? normalizedEmail).trim().toLowerCase();

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

  const existing = await db
    .selectFrom("users")
    .select(["id", "supabaseUserId"])
    .where("email", "=", normalizedEmail)
    .executeTakeFirst();

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

  const userId = newId();

  await db
    .insertInto("users")
    .values({
      id: userId,
      supabaseUserId,
      username: normalizedUsername,
      email: normalizedEmail,
      firstName,
      lastName,
      role,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  return { ok: true, userId, supabaseUserId, created: true };
}

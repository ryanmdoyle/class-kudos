import "server-only";

import { db } from "@/db";
import { nowIso } from "@/lib/dbValues";
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
  | { ok: true; userId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Create a teacher.
 *
 * Creates the Supabase auth user and then the local row, using the SAME id for
 * both — `users.id` IS the `auth.users.id`. There is no link column to keep in
 * step and therefore no way for the two to disagree.
 *
 * SUPABASE IS NOW MANDATORY HERE. This used to fall back to writing a local-only
 * row with `supabaseUserId = null` so a developer could seed before wiring up a
 * project; there is no longer an id to write, and that promise was void anyway
 * once the DATABASE itself moved to Supabase.
 *
 * Idempotent: an existing row is matched by email and updated rather than
 * duplicated.
 */

/**
 * Find an existing Supabase auth user by email.
 *
 * The admin API has `getUserById` but no lookup by address, so this pages
 * `listUsers`. Fine at this scale — a school has tens of teachers, not
 * thousands — and it is only reached when `createUser` reports a duplicate.
 */
async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;

  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;

    const match = data.users.find(
      (user) => (user.email ?? "").toLowerCase() === email,
    );
    if (match) return match.id;

    if (data.users.length < perPage) return null;
  }

  return null;
}

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

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set. A teacher " +
        "account is a Supabase auth user; there is nothing meaningful to create " +
        "without them. See SUPABASE_SETUP.md.",
    };
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    // No inbox round-trip: the operator is creating this account deliberately.
    email_confirm: true,
  });

  let authUserId: string;

  if (error || !data?.user) {
    // An existing auth user is NOT a failure for an operator tool — provisioning
    // is meant to be idempotent. Adopt it and reset the password to the one that
    // was just supplied, which is what "provision this teacher with this
    // password" has to mean if re-running it is to be useful.
    const existingAuthId = await findAuthUserIdByEmail(supabase, normalizedEmail);

    if (!existingAuthId) {
      // Operator-facing, not user-facing — being specific here is correct.
      return {
        ok: false,
        error:
          `Supabase could not create ${normalizedEmail}: ${error?.message ?? "unknown error"}.`,
      };
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingAuthId,
      { password, email_confirm: true },
    );

    if (updateError) {
      return {
        ok: false,
        error:
          `${normalizedEmail} already exists in Supabase (${existingAuthId}) but its ` +
          `password could not be reset: ${updateError.message}`,
      };
    }

    console.log(
      `ℹ️  ${normalizedEmail} already existed in Supabase — adopted ${existingAuthId} and reset its password.`,
    );
    authUserId = existingAuthId;
  } else {
    authUserId = data.user.id;
  }
  const now = nowIso();
  const existing = await findUserRowByEmail(normalizedEmail);

  if (existing) {
    // The address already has a local row. It cannot be re-pointed at the new
    // auth user: `id` is the primary key AND the link, so "relinking" would mean
    // rewriting every foreign key that references this teacher's groups.
    if (existing.id !== authUserId) {
      return {
        ok: false,
        error:
          `${normalizedEmail} already has a local account (${existing.id}) that is ` +
          `not this Supabase user. Delete one of them and re-run; they cannot be ` +
          `merged, because groups and kudos reference the id.`,
      };
    }

    await db
      .updateTable("users")
      .set({ role, firstName, lastName, updatedAt: now })
      .where("id", "=", existing.id)
      .execute();

    return { ok: true, userId: existing.id, created: false };
  }

  const { userId } = await insertTeacherRow({
    id: authUserId,
    email: normalizedEmail,
    username: normalizedUsername,
    firstName,
    lastName,
    role,
  });

  return { ok: true, userId, created: true };
}

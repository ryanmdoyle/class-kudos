import { defineScript } from "rwsdk/worker";

import { withDb } from "@/db";

import { provisionTeacher } from "@/auth/provision";
import { isSupabaseAdminConfigured } from "@/lib/supabase";

/**
 * Create ONE teacher account and nothing else.
 *
 * This is the production-safe counterpart to `npm run seed`. Seeding also
 * creates the "Period 1" demo group, five fictional students, kudos types,
 * rewards and locations — fine for a fresh dev database, wrong for a live one.
 * Use this script to create your real account without injecting demo data.
 *
 * Teachers can also sign themselves up from the login page. This script remains
 * the operator path — the first account, an ADMIN, or an account created without
 * waiting on an email — and it is the only one that can do those things.
 *
 * Credentials are read from `.dev.vars` (which is gitignored) rather than from
 * argv, so the password never lands in your shell history. `rw-scripts
 * worker-run` executes inside workerd and receives no command-line arguments.
 *
 * Usage — add to .dev.vars, run, then DELETE the two lines again:
 *
 *   TEACHER_EMAIL=you@school.org
 *   TEACHER_PASSWORD=a-real-password
 *   TEACHER_FIRST_NAME=Ryan       # optional
 *   TEACHER_LAST_NAME=Doyle       # optional
 *
 *   npm run provision-teacher
 *
 * Idempotent: re-running with the same email updates the existing row instead
 * of duplicating it. Supabase must be configured before you run it at all — a
 * teacher's `users.id` IS the `auth.users.id`, so there is no local-only row to
 * create and nothing to link up afterwards.
 */

export default defineScript(async ({ env }) => {
  await withDb(async () => {
    const secrets = env as unknown as Record<string, string | undefined>;

    const email = secrets.TEACHER_EMAIL?.trim();
    const password = secrets.TEACHER_PASSWORD;
    const firstName = secrets.TEACHER_FIRST_NAME?.trim() || "Teacher";
    const lastName = secrets.TEACHER_LAST_NAME?.trim() || "";

    if (!email || !password) {
      console.error(
        "\n❌ TEACHER_EMAIL and TEACHER_PASSWORD must both be set in .dev.vars.\n\n" +
          "   Add them, run `npm run provision-teacher`, then remove them again:\n\n" +
          "     TEACHER_EMAIL=you@school.org\n" +
          "     TEACHER_PASSWORD=a-real-password\n",
      );
      return;
    }

    if (!isSupabaseAdminConfigured()) {
      console.error(
        "\n❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.\n" +
          "    A teacher account IS a Supabase auth user — `users.id` is the\n" +
          "    `auth.users.id` — so there is nothing meaningful to create without\n" +
          "    them. See SUPABASE_SETUP.md.\n",
      );
      return;
    }

    const result = await provisionTeacher({ email, password, firstName, lastName });

    if (!result.ok) {
      console.error(`\n❌ ${result.error}\n`);
      return;
    }

    console.log(
      `\n✅ Teacher ${result.created ? "created" : "updated"}: ${email}\n` +
        `   user id: ${result.userId}  (this is also the Supabase auth.users.id)\n`,
    );

    console.log("   You can now sign in at / with this email and password.\n");

    console.log("🧹 Remember to remove TEACHER_EMAIL / TEACHER_PASSWORD from .dev.vars.\n");
  });
});

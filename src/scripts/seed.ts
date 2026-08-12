import { defineScript } from "rwsdk/worker";

import { withDb } from "@/db";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";
import { provisionTeacher } from "@/auth/provision";
import { isSupabaseAdminConfigured } from "@/lib/supabase";
import { formatCodeForDisplay } from "@/app/lib/codes";
import { insertClassCode } from "@/db/classCodeSeed";

/**
 * Seed a usable database: one teacher, one group, a handful of students, and
 * class codes for both login modes.
 *
 * Run with:
 *   npm run seed
 *
 * To override the seeded teacher, put SEED_TEACHER_EMAIL and
 * SEED_TEACHER_PASSWORD in `.dev.vars`. NOT as a shell prefix: these are read off
 * the Worker `env` below, and the vite plugin does not forward `process.env` into
 * bindings, so a prefix is silently ignored and you get the defaults.
 *
 * Supabase is REQUIRED here. A teacher IS a Supabase auth user — `users.id` is
 * the `auth.users.id` — so without the service-role key there is no teacher to
 * own the group and the script stops before writing anything. Configure
 * Supabase and re-run; seeding is idempotent.
 *
 * NOTE: `@/auth/provision` is imported HERE and nowhere under `src/app/`. It
 * carries the service-role key and must never become an RSC action.
 */

const TEACHER_EMAIL = "teacher@classkudos.local";
const TEACHER_PASSWORD = "changeme-please-8+";

const STUDENTS: ReadonlyArray<[string, string]> = [
  ["Ada", "Lovelace"],
  ["Grace", "Hopper"],
  ["Alan", "Turing"],
  ["Katherine", "Johnson"],
  ["Linus", "Torvalds"],
];

const KUDOS_TYPES: ReadonlyArray<[string, number]> = [
  ["On task", 1],
  ["Helping others", 2],
  ["Great question", 2],
];

const REWARDS: ReadonlyArray<[string, number]> = [
  ["Sit anywhere", 10],
  ["Class DJ", 25],
  ["Homework pass", 50],
];

const LOCATIONS: ReadonlyArray<[string, string]> = [
  ["Classroom", "#7DD3FC"],
  ["Library", "#FCD34D"],
  ["Bathroom", "#FCA5A5"],
];

export default defineScript(async ({ env }) => {
  await withDb(async () => {
    const secrets = env as unknown as Record<string, string | undefined>;
    const email = (secrets.SEED_TEACHER_EMAIL ?? TEACHER_EMAIL).toLowerCase();
    const password = secrets.SEED_TEACHER_PASSWORD ?? TEACHER_PASSWORD;

    console.log("🌱 Seeding Class Kudos…\n");

    if (!isSupabaseAdminConfigured()) {
      console.warn(
        "⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.\n" +
          "    A teacher account IS a Supabase auth user, so none can be created.\n" +
          "    That teacher CANNOT log in until you configure Supabase and re-run\n" +
          "    this script, which links the existing row in place.\n" +
          "    See SUPABASE_SETUP.md.\n",
      );
    }

    /* ---------------------------------------------------------------- teacher */

    const provisioned = await provisionTeacher({
      email,
      password,
      firstName: "Demo",
      lastName: "Teacher",
      role: "TEACHER",
    });

    if (!provisioned.ok) {
      console.error(`❌ Could not provision the teacher: ${provisioned.error}`);
      return;
    }

    const teacherId = provisioned.userId;
    console.log(
      `✅ Teacher ${email} (${provisioned.created ? "created" : "updated"}), ` +
        `id=${provisioned.userId}`,
    );

    /* ------------------------------------------------------------------ group */

    const now = nowIso();

    const existingGroup = await db
      .selectFrom("groups")
      .select("id")
      .where("ownerId", "=", teacherId)
      .where("name", "=", "Period 1")
      .executeTakeFirst();

    if (existingGroup) {
      console.log("ℹ️  Group \"Period 1\" already exists — nothing else to do.");
      return;
    }

    const groupId = newId();

    await db
      .insertInto("groups")
      .values({
        id: groupId,
        name: "Period 1",
        description: "Seeded demo class",
        ownerId: teacherId,
        archived: false,
        rewardedPoints: 0,
        publicId: nanoid(6),
        // Start in shared-code mode: one code for the whole class, then the
        // student picks their name. Flip with setGroupCodeMode().
        codeMode: "shared",
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    console.log(`✅ Group "Period 1" (${groupId})`);

    /* -------------------------------------------------------------- locations */

    for (const [name, color] of LOCATIONS) {
      await db
        .insertInto("locations")
        .values({
          id: newId(),
          name,
          description: null,
          color,
          isActive: true,
          groupId,
          createdAt: now,
          updatedAt: now,
        })
        .execute();
    }

    /* ------------------------------------------------------ kudos types + rewards */

    for (const [name, value] of KUDOS_TYPES) {
      await db
        .insertInto("kudosTypes")
        .values({ id: newId(), name, value, groupId })
        .execute();
    }

    for (const [name, cost] of REWARDS) {
      await db
        .insertInto("rewards")
        .values({
          id: newId(),
          name,
          cost,
          responseRequired: false,
          responsePrompt: null,
          groupId,
        })
        .execute();
    }

    /* --------------------------------------------------------------- students */

    for (const [firstName, lastName] of STUDENTS) {
      const userId = newId();

      await db
        .insertInto("users")
        .values({
          id: userId,
          // Students have NO credentials at all: no Supabase user, no email, no
          // username. They authenticate purely through classCodes, and their id is
          // a plain uuid with no auth.users counterpart.
          username: null,
          email: null,
          firstName,
          lastName,
          role: "STUDENT" as const,
          createdAt: now,
          updatedAt: now,
        })
        .execute();

      await db
        .insertInto("enrollments")
        .values({
          id: newId(),
          userId,
          groupId,
          points: 0,
          currentLocationId: null,
          locationUpdatedAt: null,
          createdAt: now,
        })
        .execute();
    }

    console.log(`✅ ${STUDENTS.length} students enrolled`);

    /* ------------------------------------------------------------ class codes */
    //
    // The teacher-facing helpers in `@/auth/classCodes` all call
    // `assertTeacherOwnsGroup()`, which reads the current user off the REQUEST
    // context. A script has no request, so we use `insertClassCode` — the one
    // place allowed to write `classCodes` without an ownership check. It is
    // shared with `tests/helpers/fixtures.ts`, which has the same problem and
    // must additionally be importable from plain Node; see the header of
    // `@/db/classCodeSeed` before adding an import to it.

    const groupCode = await insertClassCode(db, {
      kind: "group",
      groupId,
      enrollmentId: null,
    });

    const enrollments = await db
      .selectFrom("enrollments")
      .innerJoin("users", "users.id", "enrollments.userId")
      .select([
        "enrollments.id as enrollmentId",
        "users.firstName as firstName",
        "users.lastName as lastName",
      ])
      .where("enrollments.groupId", "=", groupId)
      .orderBy("users.firstName", "asc")
      .execute();

    console.log(`\n🔑 Shared class code: ${formatCodeForDisplay(groupCode)}`);
    console.log("🔑 Per-student codes (used when codeMode = 'individual'):");
    for (const e of enrollments) {
      const code = await insertClassCode(db, {
        kind: "student",
        groupId,
        enrollmentId: e.enrollmentId,
      });
      console.log(
        `   ${e.firstName} ${e.lastName}: ${formatCodeForDisplay(code)}`,
      );
    }

    console.log(
      `\n👩‍🏫 Teacher login: ${email} / ${password === TEACHER_PASSWORD ? TEACHER_PASSWORD : "(from SEED_TEACHER_PASSWORD)"}`,
    );
    console.log("🌱 Finished seeding");
  });
});

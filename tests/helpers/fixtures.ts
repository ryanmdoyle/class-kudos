import { onTestFinished } from "vitest";

import { insertClassCode } from "@/db/classCodeSeed";
import type { CodeMode } from "@/db/types";
import { newId, nowIso } from "@/lib/dbValues";

import { testDb } from "./db";
import { SEED_TEACHER_EMAIL, TEST_PREFIX } from "./env";

/**
 * Test fixtures: a teacher-owned group with students, rewards, kudos types,
 * locations and class codes, built in ONE transaction and torn down by deleting
 * the group.
 *
 * Two rules this file exists to enforce:
 *
 *  1. Fixtures never go through `@/auth/classCodes`. Every export there except
 *     `ensureGroupCode` calls `assertTeacherOwnsGroup()`, which reads the
 *     current user off the request context — and the module cannot even be
 *     imported from Node, since it pulls in `@/db` -> `cloudflare:workers`. We
 *     use `@/db/classCodeSeed`, which is shared with `src/scripts/seed.ts` and
 *     deliberately importable from here.
 *
 *  2. Fixture state is set DIRECTLY, never through actions. A `requestReward`
 *     test must not depend on `awardKudos` working, or a single bug fails two
 *     tests and neither points at it.
 */

export type FixtureStudent = {
  userId: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  /** Plaintext per-student code, when individual codes were requested. */
  code: string | null;
};

export type Fixture = {
  teacherId: string;
  groupId: string;
  groupName: string;
  groupPublicId: string;
  /** Plaintext shared class code. Present unless `sharedCode: false`. */
  sharedCode: string | null;
  students: FixtureStudent[];
  rewards: { id: string; name: string; cost: number; responseRequired: boolean }[];
  kudosTypes: { id: string; name: string; value: number }[];
  locations: { id: string; name: string; color: string }[];
  cleanup: () => Promise<void>;
};

export type FixtureOptions = {
  /** Default 3. Names come from a fixed list so failures are readable. */
  students?: number;
  /** Default "shared". */
  codeMode?: CodeMode;
  /** Issue a per-student code each. Defaults to true when codeMode is "individual". */
  individualCodes?: boolean;
  /** Issue the group-wide shared code. Default true. */
  sharedCode?: boolean;
  /** Starting points for EVERY enrollment. Default 0. */
  points?: number;
  /** `[name, cost]` or `[name, cost, responseRequired]`. */
  rewards?: ReadonlyArray<readonly [string, number] | readonly [string, number, boolean]>;
  kudosTypes?: ReadonlyArray<readonly [string, number]>;
  locations?: ReadonlyArray<string>;
  /** Owning teacher. Defaults to the seeded teacher. */
  ownerId?: string;
  /** Appended to the group name, so a leaked row says which test made it. */
  label?: string;
};

const STUDENT_NAMES: ReadonlyArray<readonly [string, string]> = [
  ["Ada", "Lovelace"],
  ["Grace", "Hopper"],
  ["Alan", "Turing"],
  ["Katherine", "Johnson"],
  ["Linus", "Torvalds"],
  ["Barbara", "Liskov"],
  ["Edsger", "Dijkstra"],
  ["Radia", "Perlman"],
];

/** Resolve the seeded teacher, with an actionable error if seeding never ran. */
export async function seededTeacherId(): Promise<string> {
  const row = await testDb()
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", SEED_TEACHER_EMAIL)
    .executeTakeFirst();

  if (!row) {
    throw new Error(
      `No teacher ${SEED_TEACHER_EMAIL} in the database.\n` +
        "  Run:  supabase start && supabase db reset && npm run seed\n" +
        "  (A teacher's users.id IS its auth.users.id, so the row can only be\n" +
        "   created through provisionTeacher — which needs the service-role key.)",
    );
  }
  return row.id;
}

/**
 * A second teacher, for cross-tenant authorization tests.
 *
 * This is FREE — no Supabase involved. `users` has no foreign key to
 * `auth.users` (that is the point of "users.id IS auth.users.id": there is no
 * join column), so a teacher row is just a uuid with role TEACHER. It cannot log
 * in, which is exactly right: these tests need a teacher who OWNS things, not
 * one who authenticates.
 */
export async function createForeignTeacher(label = "foreign"): Promise<{
  teacherId: string;
  cleanup: () => Promise<void>;
}> {
  const teacherId = newId();
  const timestamp = nowIso();
  const email = `${TEST_PREFIX}${label}-${teacherId.slice(0, 8)}@invalid`;

  await testDb()
    .insertInto("users")
    .values({
      id: teacherId,
      username: null,
      email,
      firstName: "Foreign",
      lastName: "Teacher",
      role: "TEACHER",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .execute();

  const cleanup = async () => {
    await testDb()
      .deleteFrom("users")
      .where("id", "=", teacherId)
      .where("email", "like", `${TEST_PREFIX}%`)
      .execute();
  };

  return { teacherId, cleanup };
}

export async function createFixture(
  options: FixtureOptions = {},
): Promise<Fixture> {
  const db = testDb();

  const studentCount = options.students ?? 3;
  if (studentCount > STUDENT_NAMES.length) {
    throw new Error(
      `createFixture supports at most ${STUDENT_NAMES.length} students; add more to STUDENT_NAMES.`,
    );
  }

  const codeMode: CodeMode = options.codeMode ?? "shared";
  const wantSharedCode = options.sharedCode ?? true;
  const wantIndividualCodes = options.individualCodes ?? codeMode === "individual";
  const startingPoints = options.points ?? 0;
  const ownerId = options.ownerId ?? (await seededTeacherId());

  const groupId = newId();
  const groupName = `${TEST_PREFIX}${options.label ?? "fixture"}-${groupId.slice(0, 8)}`;
  /*
   * `publicId` is UNIQUE and only 6 chars in production (nanoid(6)). Fixtures
   * use 12 chars of a uuid instead: still unique, and it removes any chance of a
   * fixture colliding with a real group and triggering addGroup's retry path.
   */
  const groupPublicId = groupId.replace(/-/g, "").slice(0, 12);

  const students: FixtureStudent[] = [];
  const rewards: Fixture["rewards"] = [];
  const kudosTypes: Fixture["kudosTypes"] = [];
  const locations: Fixture["locations"] = [];
  let sharedCode: string | null = null;

  await db.transaction().execute(async (trx) => {
    const timestamp = nowIso();

    await trx
      .insertInto("groups")
      .values({
        id: groupId,
        name: groupName,
        description: "",
        ownerId,
        archived: false,
        rewardedPoints: 0,
        publicId: groupPublicId,
        codeMode,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .execute();

    for (let index = 0; index < studentCount; index++) {
      const [firstName, lastName] = STUDENT_NAMES[index]!;
      const userId = newId();
      const enrollmentId = newId();

      await trx
        .insertInto("users")
        .values({
          id: userId,
          username: null,
          email: null,
          firstName,
          lastName,
          role: "STUDENT",
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .execute();

      await trx
        .insertInto("enrollments")
        .values({
          id: enrollmentId,
          userId,
          groupId,
          points: startingPoints,
          currentLocationId: null,
          locationUpdatedAt: null,
          createdAt: timestamp,
        })
        .execute();

      students.push({ userId, enrollmentId, firstName, lastName, code: null });
    }

    for (const entry of options.rewards ?? []) {
      const [name, cost, responseRequired = false] = entry as readonly [
        string,
        number,
        boolean?,
      ];
      const id = newId();
      await trx
        .insertInto("rewards")
        .values({
          id,
          name,
          cost,
          responseRequired: responseRequired ?? false,
          responsePrompt: responseRequired ? `Why do you deserve ${name}?` : null,
          groupId,
        })
        .execute();
      rewards.push({ id, name, cost, responseRequired: responseRequired ?? false });
    }

    for (const [name, value] of options.kudosTypes ?? []) {
      const id = newId();
      await trx
        .insertInto("kudosTypes")
        .values({ id, name, value, groupId })
        .execute();
      kudosTypes.push({ id, name, value });
    }

    for (const name of options.locations ?? []) {
      const id = newId();
      const color = "#7DD3FC";
      await trx
        .insertInto("locations")
        .values({
          id,
          name,
          description: null,
          color,
          isActive: true,
          groupId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        })
        .execute();
      locations.push({ id, name, color });
    }

    /*
     * Codes last, and on `trx` — insertClassCode probes for collisions on the
     * same executor, so it sees the codes issued earlier in this very
     * transaction. Respect both unique indexes on classCodes: at most one shared
     * code per group (partial unique on groupId WHERE enrollmentId IS NULL), and
     * at most one per enrollment.
     */
    if (wantSharedCode) {
      sharedCode = await insertClassCode(trx, {
        kind: "group",
        groupId,
        enrollmentId: null,
      });
    }

    if (wantIndividualCodes) {
      for (const student of students) {
        student.code = await insertClassCode(trx, {
          kind: "student",
          groupId,
          enrollmentId: student.enrollmentId,
        });
      }
    }
  });

  const cleanup = async () => {
    /*
     * Order is load-bearing.
     *
     * 1. Collect every enrolled userId FIRST. Students created DURING the test
     *    (createNewStudents) are not in `students`, and once the group is gone
     *    their enrollments have cascaded — leaving unreachable orphan users with
     *    no owner and no way to find them again.
     */
    const enrolled = await testDb()
      .selectFrom("enrollments")
      .select("userId")
      .where("groupId", "=", groupId)
      .execute();

    const studentIds = [
      ...new Set([...students.map((s) => s.userId), ...enrolled.map((e) => e.userId)]),
    ];

    /*
     * 2. Deleting the group cascades locations, enrollments, classCodes,
     *    kudosTypes, kudos, rewards, redeemed and locationHistory — every one of
     *    them declares `references "groups"("id") on delete cascade` in
     *    0001_initial_schema.sql. Verified empirically: after deleting a probe
     *    group, the orphan count across those tables was zero.
     */
    await testDb().deleteFrom("groups").where("id", "=", groupId).execute();

    /*
     * 3. Student `users` rows are not group-owned, so they need deleting
     *    explicitly. `role = 'STUDENT'` is a guard rather than a filter: it makes
     *    it impossible for a stray id to remove the seeded teacher.
     */
    if (studentIds.length > 0) {
      await testDb()
        .deleteFrom("users")
        .where("id", "in", studentIds)
        .where("role", "=", "STUDENT")
        .execute();
    }
  };

  return {
    teacherId: ownerId,
    groupId,
    groupName,
    groupPublicId,
    sharedCode,
    students,
    rewards,
    kudosTypes,
    locations,
    cleanup,
  };
}

/**
 * `createFixture` + automatic teardown.
 *
 * Uses vitest's `onTestFinished`, which runs even when the test throws — and
 * keeps the cleanup next to the setup instead of in a distant `afterEach`.
 */
export async function withFixture(options: FixtureOptions = {}): Promise<Fixture> {
  const fixture = await createFixture(options);
  onTestFinished(fixture.cleanup);
  return fixture;
}

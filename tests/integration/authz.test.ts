import { afterAll, beforeAll, describe, expect, it, onTestFinished } from "vitest";

import { newId, nowIso } from "@/lib/dbValues";

import { allActionModules } from "../helpers/actions";
import { testDb } from "../helpers/db";
import { TEST_PREFIX } from "../helpers/env";
import {
  createFixture,
  createForeignTeacher,
  seededTeacherId,
  withFixture,
  type Fixture,
} from "../helpers/fixtures";
import { createClient, expectHttpRefusal, type Client } from "../helpers/rsc";
import { loginAsStudentInGroup, teacherClient } from "../helpers/session";

/**
 * THE AUTHORIZATION SWEEP.
 *
 * STACK.md §2 ("Application-level authorization, not RLS") states the stakes
 * plainly: the app connects to Postgres as the owning role, `auth.uid()` is null
 * in every session, and half the userbase (students) are not Supabase users at
 * all — so RLS could not express this app's authorization even in principle.
 * Every check therefore lives in application code, and **one missed guard is a
 * hole with nothing behind it**. This file is the net under that.
 *
 * ==========================================================================
 * WHY EVERY CALL POSTS TO "/" — THIS IS THE ENTIRE POINT OF THE SWEEP.
 *
 * STACK.md trap 3: in rwsdk 1.x an RSC action POSTs to the CURRENT page URL and
 * traverses the global middleware chain plus that page's route middleware before
 * `handleAction()` runs. So `prefix("/teacher", [isAuthenticated,
 * checkRoleAccess, …])` in src/worker.tsx would happily refuse most of these
 * calls — and a sweep that POSTed to "/teacher/" would pass with every single
 * guard in `src/app/components/**` deleted.
 *
 * "/" is the login page. Its only route middleware is
 * `routeToDashboardByRoleOnLogin`, which opens with `if (isAction) return;`, and
 * the one global middleware (`attachAuth`) never returns a Response. So a
 * refusal observed here can ONLY have come from the ACTION'S OWN GUARD.
 *
 * If someone ever adds a middleware to "/" that can refuse an action, every test
 * in this file becomes a tautology. Do not let that happen.
 * ==========================================================================
 *
 * ONE TABLE, four passes over it. Each pass changes exactly one thing about the
 * caller and asserts the exact string the guard for THAT caller produces:
 *
 *   1. NOBODY          — no session, a crafted action id. `requireUser()` refuses:
 *                        "You need to sign in to do that."
 *   2. THE RIGHTFUL OWNER — the positive control. The identical argument list, aimed
 *                        at a class the caller genuinely owns, must SUCCEED.
 *   3. ANOTHER TEACHER — fully authenticated and genuinely a teacher, so
 *                        `requireTeacher()` passes and the refusal must come from
 *                        `assertTeacherOwnsGroup()`: 404 "Not found", never 403, so
 *                        group ids are not enumerable by response code.
 *   4. A STUDENT of an unrelated class — the role check fires FIRST for every
 *                        teacher-side action ("Forbidden"), and
 *                        `assertStudentEnrolled()` for the student-side ones.
 *
 * Pass 2 is what makes the other three mean anything. "The action refused" and
 * "the action refused BECAUSE OF AUTHORIZATION" are different claims: a sweep
 * asserting a vague "some error" would pass just as green if the arguments were
 * malformed, and would keep passing after the guard was deleted. Every argument
 * below is therefore deliberately VALID, and proven so by succeeding in pass 2 —
 * leaving ownership as the only variable that changed.
 */

/** See the block comment above. Never change this to a /teacher or /student path. */
const SWEEP_PATH = "/";

/** src/app/components/public/locationService.ts — both containment refusals. */
const CONTAINMENT_REFUSAL = "We couldn't find that student. Please refresh the page.";

/* -------------------------------------------------------------------------- */
/* The scene                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Populated by `beforeAll`, read by the table's argument thunks.
 *
 * The table is module-scope so the completeness test can cross-check it against
 * the source, but the ids it targets only exist once the fixtures are built — so
 * every row supplies a THUNK that is called inside the test body rather than a
 * pre-baked args array.
 */
const scene = {
  /** Owned by a foreign teacher. Every row below aims at one of its ids. */
  victim: undefined as unknown as Fixture,
  /** A `redeemed` row, for approveRedeemed / cancelRedeemed. */
  victimRedeemedId: "",
  /**
   * A completely unrelated class: the home of our student caller, and the source
   * of the "wrong group" ids the containment checks need.
   */
  outsider: undefined as unknown as Fixture,
};

let teacher: Client;
/** A real student session — of `outsider`, never of `victim`. */
let outsiderStudent: Client;
/** Every victim row, as it stood before a single refused call was made. */
let baseline: GroupSnapshot;

const cleanups: Array<() => Promise<void>> = [];

beforeAll(async () => {
  /*
   * The victim's owner is a foreign teacher — a plain `users` row with role
   * TEACHER and no Supabase counterpart, which is free precisely because
   * `users` has no foreign key to `auth.users` (STACK.md §2). It cannot log in,
   * which is exactly right: we need a teacher who OWNS things, not one who
   * authenticates.
   */
  /*
   * Each cleanup is registered THE MOMENT its object exists, not in a batch at
   * the end. `afterAll` runs `cleanups` in reverse, so pushing as we go still
   * gives the LIFO order teardown needs (groups before the teachers that own
   * them) — and it means a failure part-way through setup still tidies up
   * whatever was already created. Registering all four at the end left every
   * object before that point unprotected: one `insertClassCode` collision or pool
   * timeout and the victim group, its two students and its codes survived the run.
   */
  const victimOwner = await createForeignTeacher("authz-victim");
  cleanups.push(victimOwner.cleanup);

  const outsiderOwner = await createForeignTeacher("authz-outsider");
  cleanups.push(outsiderOwner.cleanup);

  scene.victim = await createFixture({
    students: 2,
    points: 10,
    codeMode: "shared",
    rewards: [["Sit anywhere", 10]],
    kudosTypes: [["On task", 1]],
    locations: ["Library"],
    ownerId: victimOwner.teacherId,
    label: "authz-victim",
  });
  cleanups.push(scene.victim.cleanup);

  scene.outsider = await createFixture({
    students: 1,
    points: 10,
    codeMode: "shared",
    rewards: [["Line leader", 5]],
    kudosTypes: [["Kind", 1]],
    locations: ["Outside"],
    ownerId: outsiderOwner.teacherId,
    label: "authz-outsider",
  });
  cleanups.push(scene.outsider.cleanup);

  scene.victimRedeemedId = await seedRedeemed(scene.victim);

  teacher = await teacherClient();
  outsiderStudent = await loginAsStudentInGroup(
    scene.outsider.sharedCode!,
    (students) => students[0]!.id,
  );

  baseline = await snapshotGroup(scene.victim.groupId);
});

/**
 * A `redeemed` row inside a fixture's group. Returns its id.
 *
 * `redeemed` is the one table no fixture option covers, and two exports target it
 * by bare id. Written directly rather than through `requestReward` so a bug in
 * that action cannot fail this file (tests/helpers/fixtures.ts, rule 2). It
 * cascades away with the group.
 */
async function seedRedeemed(fixture: Fixture): Promise<string> {
  const id = newId();
  await testDb()
    .insertInto("redeemed")
    .values({
      id,
      userId: fixture.students[0]!.userId,
      groupId: fixture.groupId,
      name: fixture.rewards[0]!.name,
      cost: fixture.rewards[0]!.cost,
      response: null,
      reviewed: false,
      reviewedAt: null,
      createdAt: nowIso(),
    })
    .execute();
  return id;
}

afterAll(async () => {
  /*
   * `withFixture` cannot be used here: it registers `onTestFinished`, which only
   * exists inside a test, and the whole file shares one victim so that the
   * "nothing changed" test can observe the effect of every row that ran before
   * it. So cleanup is explicit, and reversed.
   *
   * Each failure is swallowed so one bad cleanup cannot strand the rest — the
   * whole point of registering these individually is that partial setup still gets
   * tidied, and aborting the loop halfway would undo that.
   */
  for (const cleanup of cleanups.reverse()) {
    await cleanup().catch((error: unknown) => {
      console.warn("[authz] cleanup failed, continuing:", error);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How a refusal is observable — three of the five channels the harness header
 * enumerates. These are genuinely different behaviours, not three spellings of one
 * (STACK.md trap 3), and which one an action uses is a property of where its
 * guards sit relative to its `try`:
 *
 *   "returned"    — the guard threw INSIDE the action's try, so `fail()` flattened
 *                   `ErrorResponse` into a value. HTTP 200 text/x-component. Both
 *                   teacher modules work this way.
 *   "thrown"      — the guard sits OUTSIDE the try, so `ErrorResponse` reaches
 *                   rwsdk's top-level catch and becomes a real HTTP status with a
 *                   text/plain body. The student module works this way.
 *   "containment" — no session is involved at all (the public board). The refusal
 *                   is an ordinary `{ ok: false }` result from `applyLocationChange`.
 */
type Expectation =
  | { channel: "returned"; error: string }
  | { channel: "thrown"; status: number; body: string }
  | { channel: "containment"; error: string };

/**
 * What a row's arguments are built from.
 *
 * Parameterising the thunk on the target — rather than baking in the victim — is
 * what lets ONE table drive both the refusal sweep and the positive control
 * below. Swap the fixtures and the identical argument list must now SUCCEED.
 */
type Target = {
  /** The group being aimed at. */
  group: Fixture;
  /** A `redeemed` row inside `group`. */
  redeemedId: string;
  /**
   * Where the containment probe's enrollment comes from: a DIFFERENT class in the
   * sweep, the SAME one in the positive control. That single substitution is
   * exactly what flips `applyLocationChange`'s containment check from refuse to
   * allow, which is why the public row needs no special casing anywhere.
   */
  otherClass: Fixture;
};

type SweepRow = {
  action: string;
  /** Which `"use server"` module owns it — drives the completeness check. */
  module: "teacher" | "options" | "student" | "public";
  /** Called inside the test body, once the fixtures exist. */
  args: (target: Target) => unknown[];
  /** Expected refusal for a caller with NO SESSION AT ALL. */
  asAnonymous: Expectation;
  /** Expected refusal for the seeded TEACHER aiming at another teacher's ids. */
  asTeacher: Expectation;
  /**
   * Expected refusal for a STUDENT of an unrelated class. Omitted only where the
   * caller has no session at all and the row therefore cannot vary by role.
   */
  asStudent?: Expectation;
};

/*
 * The expected refusals, named after the guard that produces them. Each row below
 * names three — one per caller — and which of these appears where is a statement
 * about GUARD ORDER inside that action, not a formality:
 *
 *   requireUser()             -> 401 "You need to sign in to do that."
 *   requireTeacher()/Student()-> 403 "Forbidden"
 *   assertTeacherOwnsGroup()  -> 404 "Not found"   (never 403 — see below)
 *   assertStudentEnrolled()   -> 404 "Not found"
 *
 * Move a guard and one of these changes. That is the point.
 */

/** `requireUser()` is the first thing in every chain, so anonymity loses first. */
const NOT_SIGNED_IN: Expectation = {
  channel: "returned",
  error: "You need to sign in to do that.",
};

/**
 * `assertTeacherOwnsGroup` throws 404 rather than 403 ON PURPOSE (src/auth/context.ts):
 * a teacher who cannot tell "someone else's group" from "no such group" cannot
 * enumerate group ids by response code. Asserting the exact string is what keeps
 * that property from being "simplified" into a more informative 403.
 */
const NOT_YOURS: Expectation = { channel: "returned", error: "Not found" };

/** `requireTeacher()` runs before any group lookup, so role loses before ownership. */
const WRONG_ROLE: Expectation = { channel: "returned", error: "Forbidden" };

/** The student module's guards are outside its try, so these are real statuses. */
const NOT_SIGNED_IN_THROWN: Expectation = {
  channel: "thrown",
  status: 401,
  body: "You need to sign in to do that.",
};
const TEACHER_IS_NOT_A_STUDENT: Expectation = {
  channel: "thrown",
  status: 403,
  body: "Forbidden",
};
const STUDENT_NOT_ENROLLED: Expectation = {
  channel: "thrown",
  status: 404,
  body: "Not found",
};

/** The public board has no session to check, so containment is its only guard. */
const CONTAINED: Expectation = {
  channel: "containment",
  error: CONTAINMENT_REFUSAL,
};

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/**
 * ONE ROW PER OWNERSHIP-SCOPED EXPORT. The completeness test at the bottom fails
 * if an export is missing from here, so this list cannot silently rot.
 *
 * Argument choices are not arbitrary. Where an action validates a FormData field
 * BEFORE (or after) its guard, the field is supplied and valid — otherwise the
 * call would refuse for a reason that has nothing to do with authorization and
 * the row would keep passing after the guard was deleted.
 */
const SWEEP: SweepRow[] = [
  /* ---------------------------------------------------------------- groups */
  {
    /* Guard is the very first statement; no role check of its own to fire first. */
    action: "archiveGroup",
    module: "teacher",
    args: (t) => [t.group.groupId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* ----------------------------------------------------------- kudos types */
  {
    /* `groupId` is read from the form and then asserted — the client's own id is
     * never trusted as proof of anything. name/value are valid so the only
     * possible refusal is ownership. */
    action: "addKudoType",
    module: "teacher",
    args: (t) => [formData({ groupId: t.group.groupId, name: "Trespass", value: "1" })],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* Holds only a child id: `assertOwnsKudosType` resolves the owning group FROM
     * THE DATABASE and asserts on that, so a crafted id cannot reach another
     * teacher's data. The row EXISTS, so 404 here means "not yours". */
    action: "editKudoType",
    module: "teacher",
    args: (t) => [
      formData({ id: t.group.kudosTypes[0]!.id, name: "Renamed by an intruder", value: "99" }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "deleteKudoType",
    module: "teacher",
    args: (t) => [t.group.kudosTypes[0]!.id],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* --------------------------------------------------------------- rewards */
  {
    action: "addReward",
    module: "teacher",
    args: (t) => [
      formData({
        groupId: t.group.groupId,
        name: "Trespass",
        cost: "1",
        responseRequired: "off",
        responsePrompt: "",
      }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* Cost is where this one bites if the guard goes: a reward repriced to 0 by an
     * outsider drains the class's kudos economy. */
    action: "editReward",
    module: "teacher",
    args: (t) => [
      formData({ id: t.group.rewards[0]!.id, name: "Free stuff", cost: "0" }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "deleteReward",
    module: "teacher",
    args: (t) => [t.group.rewards[0]!.id],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* --------------------------------------------------------------- awarding */
  {
    /* Every id here is real and internally consistent — the kudos type and the
     * enrollment both belong to the group named. The action's own consistency
     * checks ("does not belong to this group", "none of those students") therefore
     * cannot be what refuses this call. */
    action: "awardKudos",
    module: "teacher",
    args: (t) => [t.group.groupId, t.group.kudosTypes[0]!.id, [t.group.students[0]!.enrollmentId]],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* A pure read, and the one row whose leak would be silent: it returns the
     * whole roster with names and point balances. */
    action: "getUpdatedEnrollments",
    module: "teacher",
    args: (t) => [t.group.groupId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* ----------------------------------------------------------------- roster */
  {
    action: "createNewStudents",
    module: "teacher",
    args: (t) => [t.group.groupId, [{ firstName: "Mallory", lastName: "Intruder" }]],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "editEnrolled",
    module: "teacher",
    args: (t) => [
      formData({
        groupId: t.group.groupId,
        userId: t.group.students[0]!.userId,
        firstName: "Renamed",
        lastName: "ByIntruder",
      }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* The most destructive export in the module: for a student with no other
     * enrolment it deletes the `users` row and cascades their kudos, redemptions,
     * class code and travel history. */
    action: "removeEnrollment",
    module: "teacher",
    args: (t) => [t.group.groupId, t.group.students[0]!.enrollmentId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* ------------------------------------------------------------ redemptions */
  {
    /* `requireTeacher()` first, then the group is resolved from the `redeemed`
     * row. The row exists, so this cannot 404 for absence. */
    action: "approveRedeemed",
    module: "teacher",
    args: (t) => [t.redeemedId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* Cancel refunds points, so an unguarded version mints kudos in someone
     * else's class. */
    action: "cancelRedeemed",
    module: "teacher",
    args: (t) => [t.redeemedId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* -------------------------------------------------------------- locations */
  {
    action: "addLocation",
    module: "teacher",
    args: (t) => [
      formData({
        groupId: t.group.groupId,
        name: "Intruder's corner",
        color: "#000000",
        description: "should never exist",
      }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "editLocation",
    module: "teacher",
    args: (t) => [
      formData({ id: t.group.locations[0]!.id, name: "Renamed", color: "#000000" }),
    ],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    /* A soft delete that also closes open travel-history rows and sends everyone
     * standing there back to "no location" — three writes in a transaction, all of
     * them in another teacher's class. */
    action: "deleteLocation",
    module: "teacher",
    args: (t) => [t.group.locations[0]!.id],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* ------------------------------------------------- teacher options: codes */
  /*
   * These five are the class-code surface, and a hole in any of them is the worst
   * kind in the app: the caller learns the plaintext codes for a class that is
   * not theirs (the `CodesResult` payload contains them) or invalidates the cards
   * a class is already holding.
   *
   * All five call `requireTeacher()` in the wrapper before delegating, and every
   * function in `@/auth/classCodes` then calls `assertTeacherOwnsGroup` again —
   * three of them (setGroupCodeMode, rotateGroupCode, issueStudentCode) from
   * inside a transaction they opened themselves, passing `trx` down as STACK.md
   * trap 1 requires. So the refusal is still a 404 flattened by the wrapper's
   * `fail()`.
   */
  {
    action: "setCodeMode",
    module: "options",
    /*
     * This row checks the RETURNED STRING only, and cannot check more than that.
     * The write it would need to observe is a no-op here — `scene.victim` is
     * already "shared" — and neither argument makes this row able to detect a
     * missing guard:
     *
     *   "shared"     -> no column changes, so nothing to see.
     *   "individual" -> `setGroupCodeMode` delegates to
     *                   `issueStudentCodesForGroup`, which re-checks ownership
     *                   INSIDE the same transaction and rolls the whole thing
     *                   back. Genuinely safe, so still nothing to see.
     *
     * The direction that IS exploitable — individual -> shared, where the
     * delegate is `ensureGroupCode`, the one export that deliberately does not
     * guard — has its own test below ("refuses to flip an individual-mode class
     * it does not own"). Do not try to make this row carry that load.
     */
    args: (t) => [t.group.groupId, "shared"],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "ensureSharedCode",
    module: "options",
    args: (t) => [t.group.groupId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "regenerateSharedCode",
    module: "options",
    args: (t) => [t.group.groupId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "generateStudentCodes",
    module: "options",
    args: (t) => [t.group.groupId, true],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },
  {
    action: "resetStudentCode",
    module: "options",
    args: (t) => [t.group.groupId, t.group.students[0]!.enrollmentId],
    asAnonymous: NOT_SIGNED_IN,
    asTeacher: NOT_YOURS,
    asStudent: WRONG_ROLE,
  },

  /* ------------------------------------------------------- student module */
  /*
   * Both guards sit OUTSIDE the try here, deliberately (see the header of
   * src/app/components/student/functions.ts), so these two refuse with a REAL
   * HTTP status rather than a value. That difference is itself the assertion: if
   * someone "tidies" these guards inside a try, the channel changes and these
   * rows fail.
   */
  {
    action: "requestReward",
    module: "student",
    args: (t) => [{ groupId: t.group.groupId, rewardId: t.group.rewards[0]!.id }],
    asAnonymous: NOT_SIGNED_IN_THROWN,
    asTeacher: TEACHER_IS_NOT_A_STUDENT,
    asStudent: STUDENT_NOT_ENROLLED,
  },
  {
    action: "setMyLocation",
    module: "student",
    args: (t) => [{ groupId: t.group.groupId, locationId: t.group.locations[0]!.id }],
    asAnonymous: NOT_SIGNED_IN_THROWN,
    asTeacher: TEACHER_IS_NOT_A_STUDENT,
    asStudent: STUDENT_NOT_ENROLLED,
  },

  /* -------------------------------------------------------- public module */
  {
    /*
     * Deliberately unauthenticated: the classroom board is a projector nobody logs
     * in to, and the capability is the group's `publicId`. So there is no session
     * to refuse and no `asStudent` variant — the meaningful property is
     * CONTAINMENT. We hand it the victim's board id together with an enrollment
     * from a DIFFERENT class; `applyLocationChange`'s containment check #1 must
     * refuse rather than move the wrong child.
     *
     * The legacy version took a bare `enrollmentId` with no group check, which let
     * anyone move any student in any class in the system.
     */
    action: "updateTravelLocation",
    module: "public",
    args: (t) => [
      t.group.groupPublicId,
      t.otherClass.students[0]!.enrollmentId,
      t.group.locations[0]!.id,
    ],
    asAnonymous: CONTAINED,
    asTeacher: CONTAINED,
  },
];

/* -------------------------------------------------------------------------- */
/* The two sweep bodies                                                        */
/* -------------------------------------------------------------------------- */

/** The victim's ids, with the containment probe pointed at a different class. */
function crossTenant(): Target {
  return {
    group: scene.victim,
    redeemedId: scene.victimRedeemedId,
    otherClass: scene.outsider,
  };
}

async function assertRefused(
  client: Client,
  row: SweepRow,
  expected: Expectation,
  /**
   * Which ids to aim at. Defaults to the shared victim; the options probe passes
   * a private one so it cannot be affected by an earlier row's writes.
   */
  target: Target = crossTenant(),
): Promise<void> {
  const args = row.args(target);

  switch (expected.channel) {
    case "returned": {
      /*
       * Guards inside the try are flattened to a VALUE, so this is a normal HTTP
       * 200 flight response. `client.action` throwing here would itself be a
       * finding: it would mean the refusal escaped as a status, i.e. the guard
       * moved outside the try.
       */
      const result = await client.action<{ success: boolean; error: string | null }>(
        row.action,
        args,
        { path: SWEEP_PATH },
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(expected.error);
      return;
    }

    case "thrown": {
      await expectHttpRefusal(client.action(row.action, args, { path: SWEEP_PATH }), {
        status: expected.status,
        bodyIncludes: expected.body,
      });
      return;
    }

    case "containment": {
      const result = await client.action<{ ok: boolean; error?: string }>(
        row.action,
        args,
        { path: SWEEP_PATH },
      );
      expect(result).toEqual({ ok: false, error: expected.error });
      return;
    }
  }
}

describe("no session at all — a logged-out caller with a crafted action id", () => {
  /*
   * The attacker the module headers name explicitly: "a teacher, another class's
   * student, or a logged-out attacker with a crafted action id could invoke them
   * directly" (src/app/components/student/functions.ts).
   *
   * This is also the caller for which SWEEP_PATH matters most. POSTing these to
   * "/teacher/…" would be refused by the `isAuthenticated` middleware with a 401
   * before the action ran at all — indistinguishable over HTTP from the action's
   * own guard, and still a 401 with every `requireUser()` in the app deleted.
   * From "/" there is no middleware to hide behind.
   *
   * A fresh client per test: no cookie jar, and a fresh CF-Connecting-IP, so
   * nothing here inherits a session or a rate-limit budget from another test.
   */
  it.each(SWEEP)("$action", async (row) => {
    await assertRefused(createClient(), row, row.asAnonymous);
  });
});

describe("positive control — the same arguments, against the caller's own class", () => {
  /*
   * !! THIS IS WHAT MAKES EVERY OTHER SWEEP IN THIS FILE MEAN ANYTHING. !!
   *
   * "The action refused" and "the action refused BECAUSE OF AUTHORIZATION" are
   * different claims, and only the second is worth testing. Every refusal in this
   * file would pass just as green if the row's arguments were malformed — a missing
   * FormData field, a kudos type that belongs to no group, a `redeemed` id that
   * does not exist — and it would keep passing after the guard was deleted, because
   * the action would still fail, just for a different reason. `fail()` flattens
   * both into the same shape.
   *
   * So every row runs here too, with the identical argument list, aimed at a
   * throwaway class the caller genuinely owns — and must SUCCEED. The caller's
   * relationship to the target is then the only variable in play, which is exactly
   * the attribution the other sweeps claim.
   *
   * A fresh fixture per row, not one shared: several rows are destructive
   * (deleteKudoType, deleteReward, removeEnrollment, deleteLocation) and would
   * otherwise make the rows after them fail for reasons of sequencing rather than
   * authorization — reintroducing the exact confound this test exists to remove.
   */
  it.each(SWEEP)("$action", async (row) => {
    const own = await withFixture({
      students: 2,
      points: 10,
      codeMode: "shared",
      rewards: [["Sit anywhere", 10]],
      kudosTypes: [["On task", 1]],
      locations: ["Library"],
      label: "authz-control",
    });

    /* `otherClass: own` is the whole trick for the public row: containment then
     * holds, and the same thunk that probed across a boundary now stays inside
     * one. Nothing else in the table reads it. */
    const target: Target = {
      group: own,
      redeemedId: await seedRedeemed(own),
      otherClass: own,
    };

    /*
     * The student module needs a student OF THIS GROUP — the rightful caller. The
     * teacher and public rows are fine with the seeded teacher's session (the
     * public board ignores sessions entirely).
     */
    const caller =
      row.module === "student"
        ? await loginAsStudentInGroup(own.sharedCode!, (students) => students[0]!.id)
        : teacher;

    const result = await caller.action<{
      success?: boolean;
      ok?: boolean;
      error?: string | null;
    }>(row.action, row.args(target), { path: SWEEP_PATH });

    /* Two result conventions in play: `ActionResult`/`CodesResult` for the teacher
     * modules, `{ ok }` for the student and public ones. */
    if (row.module === "teacher" || row.module === "options") {
      expect(result.error).toBe(null);
      expect(result.success).toBe(true);
    } else {
      expect(result.error).toBeUndefined();
      expect(result.ok).toBe(true);
    }
  });
});

describe("cross-tenant sweep — a real teacher, aimed at another teacher's group", () => {
  /*
   * The caller is fully authenticated and genuinely a teacher, so `requireTeacher()`
   * is satisfied on every row. Whatever refuses these calls is the OWNERSHIP check,
   * and it must say "Not found" rather than "Forbidden" so that group ids cannot be
   * enumerated by response code.
   */
  it.each(SWEEP)("$action", async (row) => {
    await assertRefused(teacher, row, row.asTeacher);
  });
});

describe("a child id that exists nowhere is also \"Not found\"", () => {
  /*
   * The other branch of the same guards — and the one the sweep above never
   * reaches.
   *
   * `assertOwnsKudosType`, `assertOwnsReward` and `assertOwnsLocation` each have
   * two exits: `if (!row) throw new ErrorResponse(404, "Not found")` when the id
   * matches nothing at all, and `assertTeacherOwnsGroup` when it matches a row in
   * someone else's class. Every row in SWEEP targets an id that EXISTS, so only
   * the second exit is ever taken.
   *
   * Both must say exactly "Not found", because that indistinguishability IS the
   * property: if the missing-row branch ever said "Not found" while the
   * wrong-owner branch said "Forbidden" (or vice versa), a teacher could probe ids
   * and learn which ones are real from the response alone. `approveRedeemed` and
   * `cancelRedeemed` reach the same fork through their own inline SELECT.
   *
   * These take a bare child id with no groupId, so a fabricated uuid is a
   * meaningful input rather than a malformed one.
   */
  const FABRICATED: ReadonlyArray<readonly [string, () => unknown[]]> = [
    ["deleteKudoType", () => [newId()]],
    ["editKudoType", () => [formData({ id: newId(), name: "Ghost", value: "1" })]],
    ["deleteReward", () => [newId()]],
    ["editReward", () => [formData({ id: newId(), name: "Ghost", cost: "1" })]],
    ["deleteLocation", () => [newId()]],
    ["editLocation", () => [formData({ id: newId(), name: "Ghost", color: "#000000" })]],
    ["approveRedeemed", () => [newId()]],
    ["cancelRedeemed", () => [newId()]],
  ];

  it.each(FABRICATED)("%s", async (action, args) => {
    const result = await teacher.action<{ success: boolean; error: string | null }>(
      action,
      args(),
      { path: SWEEP_PATH },
    );

    expect(result.success).toBe(false);
    expect(
      result.error,
      `${action} distinguishes "does not exist" from "not yours". Both must be ` +
        '"Not found", or ids become enumerable by response code.',
    ).toBe("Not found");
  });
});

describe("the options module writes nothing when it refuses", () => {
  /*
   * A LOCAL probe for the five class-code actions, because for these the returned
   * error string is not evidence of anything.
   *
   * Every one of them ends with `return await currentView(groupId)`, and
   * `currentView` -> `getGroupCodes` calls `assertTeacherOwnsGroup` AGAIN — after
   * the delegate has already run and committed its own transaction. So "Not found"
   * is manufactured by that trailing read whether or not the delegate guarded
   * anything at all. The sweep row above cannot distinguish the two.
   *
   * What actually discriminates is whether the DATABASE changed. The file-wide
   * snapshot at the end does check that, but it runs a hundred assertions later,
   * so a failure there points nowhere useful. Reading codeMode and the class-code
   * rows immediately either side of ONE refused call makes the attribution local:
   * if this fails, the guard inside that specific delegate is missing.
   *
   * Established by mutation, guard by guard, rather than assumed:
   *
   *   rotateGroupCode          guard deleted -> THIS TEST FAILS (regenerateSharedCode)
   *   issueStudentCode         guard deleted -> THIS TEST FAILS (resetStudentCode)
   *   setGroupCodeMode         guard deleted -> caught by the individual->shared
   *                            test below, not here (see its comment for why)
   *   ensureSharedCode         guard deleted -> caught by the no-existing-code
   *                            test below, not here
   *   issueStudentCodesForGroup  guard deleted -> NOTHING FAILS, and that is
   *                            correct: it issues each code through
   *                            `issueStudentCode`, which guards every write
   *                            itself. Its own guard is fail-fast only, so its
   *                            removal is not a reachable bug. Do not add a test
   *                            for it — there is nothing to catch.
   *
   * !! EACH ROW GETS ITS OWN FRESH VICTIM, and that is load-bearing. !!
   *
   * Snapshotting the SHARED `scene.victim` looked equivalent and was not: the
   * plain cross-tenant sweep above calls every one of these actions first, so
   * under a missing-guard mutation that earlier call has ALREADY written. This
   * probe's `before` would then capture the damaged state and its own call become
   * a no-op — `onlyMissing: true` finds nothing missing any more. A private victim
   * makes the probe independent of what ran before it.
   */
  const optionsRows = SWEEP.filter((row) => row.module === "options");

  it.each(optionsRows)("$action leaves the victim's codes untouched", async (row) => {
    const owner = await createForeignTeacher(`options-${row.action}`);
    onTestFinished(owner.cleanup);

    /*
     * Shared mode with a group code and NO per-student codes: the state in which
     * `regenerateSharedCode`, `generateStudentCodes` and `resetStudentCode` all
     * write something observable if they are allowed to run.
     */
    const victim = await withFixture({
      students: 2,
      codeMode: "shared",
      ownerId: owner.teacherId,
      label: `options-${row.action}`,
    });

    const target: Target = {
      group: victim,
      redeemedId: scene.victimRedeemedId,
      otherClass: scene.outsider,
    };

    const before = await codeStateOf(victim.groupId);
    await assertRefused(teacher, row, row.asTeacher, target);
    const after = await codeStateOf(victim.groupId);

    expect(
      after,
      `${row.action} refused, but it changed the victim's class-code state. The ` +
        "refusal came from the trailing currentView() read, not from a guard inside " +
        "the delegate — so the write went through first.",
    ).toEqual(before);
  });

  /**
   * The one genuinely exploitable direction, and the only test that catches it.
   *
   * `setGroupCodeMode` updates `groups.codeMode` and then branches:
   *
   *   mode "individual" -> issueStudentCodesForGroup, which re-checks ownership
   *                        inside the SAME transaction, so an unguarded call
   *                        throws and the update rolls back. Safe by accident,
   *                        but safe.
   *   mode "shared"     -> ensureGroupCode, which by design does NOT check
   *                        ownership (addGroup calls it mid-transaction on a
   *                        group that is not committed yet). Nothing downstream
   *                        rolls anything back.
   *
   * So an individual-mode class flipped to "shared" by a stranger COMMITS. That
   * matters because `resolveCode` refuses a code whose `kind` does not match the
   * group's current codeMode: every per-student code stops working at once and
   * the whole roster is locked out, with no automatic repair.
   *
   * Verified by mutation: deleting `assertTeacherOwnsGroup` from
   * `setGroupCodeMode` leaves every other test in the repo green. This one fails.
   */
  it("refuses to flip an individual-mode class it does not own", async () => {
    const owner = await createForeignTeacher("codemode-victim");
    onTestFinished(owner.cleanup);

    const victim = await withFixture({
      students: 2,
      codeMode: "individual",
      individualCodes: true,
      ownerId: owner.teacherId,
      label: "codemode-victim",
    });

    const before = await codeStateOf(victim.groupId);
    expect(before.codeMode).toBe("individual");

    const result = await teacher.action<{ success: boolean; error: string | null }>(
      "setCodeMode",
      [victim.groupId, "shared"],
      { path: SWEEP_PATH },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not found");

    const after = await codeStateOf(victim.groupId);
    expect(
      after.codeMode,
      "a stranger flipped this class to shared. Every per-student code now fails " +
        "resolveCode's kind check and the whole roster is locked out.",
    ).toBe("individual");
    expect(after).toEqual(before);
  });

  /**
   * `ensureSharedCode` against a class that has NO shared code yet.
   *
   * The row-based probe above cannot catch this one. `scene.victim` already holds
   * a shared code, so an unguarded `ensureGroupCode` finds it and returns early —
   * nothing is written, and "no change" is indistinguishable from "refused".
   *
   * `ensureGroupCode` is the one export in `@/auth/classCodes` that deliberately
   * does NOT check ownership (`addGroup` calls it mid-transaction on a group that
   * is not committed yet, so it cannot). That makes the wrapper's own
   * `assertTeacherOwnsGroup` the ONLY thing standing in front of it — delete that
   * and a stranger mints a working class code for someone else's class, which is a
   * credential for the whole roster.
   *
   * Against a class with no code, the write is finally observable.
   */
  it("refuses to mint a shared code for a class it does not own", async () => {
    const owner = await createForeignTeacher("nocode-victim");
    onTestFinished(owner.cleanup);

    const victim = await withFixture({
      students: 1,
      codeMode: "shared",
      sharedCode: false,
      ownerId: owner.teacherId,
      label: "nocode-victim",
    });

    const before = await codeStateOf(victim.groupId);
    expect(before.codes, "fixture must start with no codes at all").toEqual([]);

    const result = await teacher.action<{ success: boolean; error: string | null }>(
      "ensureSharedCode",
      [victim.groupId],
      { path: SWEEP_PATH },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not found");

    const after = await codeStateOf(victim.groupId);
    expect(
      after.codes,
      "a stranger minted a class code for someone else's class — that code is a " +
        "credential for the entire roster",
    ).toEqual([]);
    expect(after).toEqual(before);
  });
});

/** codeMode plus every class-code row, which is all the options module can touch. */
async function codeStateOf(groupId: string) {
  const db = testDb();
  return {
    codeMode: (
      await db
        .selectFrom("groups")
        .select("codeMode")
        .where("id", "=", groupId)
        .executeTakeFirstOrThrow()
    ).codeMode,
    codes: await db
      .selectFrom("classCodes")
      .select(["id", "code", "codeHash", "kind", "enrollmentId"])
      .where("groupId", "=", groupId)
      .orderBy("code", "asc")
      .execute(),
  };
}

describe("cross-tenant sweep — a student of an unrelated class", () => {
  /*
   * The other half of the matrix, and the one that catches a guard written as
   * `requireUser()` instead of `requireTeacher()`. For every teacher-side export
   * the ROLE check fires before any group lookup, so the answer is "Forbidden";
   * for the student-side ones the role passes and `assertStudentEnrolled` refuses
   * with 404. Students know each other, and the class next door's shared code is
   * on the wall — this caller is not hypothetical.
   */
  it.each(SWEEP.filter((row) => row.asStudent))("$action", async (row) => {
    await assertRefused(outsiderStudent, row, row.asStudent!);
  });
});

describe("public board containment", () => {
  /*
   * `updateTravelLocation` cannot be refused on identity, so containment is the
   * whole of its authorization. The table row covers "an enrollment from another
   * class"; these two cover the other two directions, both of which
   * `applyLocationChange` must refuse with the SAME string — "no such enrollment"
   * and "not in this group" are deliberately indistinguishable.
   */
  it("refuses a victim's student even when the caller holds their own board id", async () => {
    const result = await teacher.action<{ ok: boolean; error?: string }>(
      "updateTravelLocation",
      [
        scene.outsider.groupPublicId,
        scene.victim.students[0]!.enrollmentId,
        scene.outsider.locations[0]!.id,
      ],
      { path: SWEEP_PATH },
    );
    expect(result).toEqual({ ok: false, error: CONTAINMENT_REFUSAL });
  });

  it("refuses a destination belonging to a different class", async () => {
    /* Containment check #2: the enrollment is legitimate for this board, the
     * DESTINATION is not. Without it a board could park children in rooms that
     * belong to another class's travel log. */
    const result = await teacher.action<{ ok: boolean; error?: string }>(
      "updateTravelLocation",
      [
        scene.victim.groupPublicId,
        scene.victim.students[0]!.enrollmentId,
        scene.outsider.locations[0]!.id,
      ],
      { path: SWEEP_PATH },
    );
    expect(result).toEqual({ ok: false, error: CONTAINMENT_REFUSAL });
  });
});

describe("addGroup — the one export with no cross-tenant target", () => {
  /*
   * `addGroup` takes no id at all: `ownerId` comes from the session, never from
   * the form, so there is no other teacher's group to aim it at and it is EXEMPT
   * from the table above. That exemption is only sound if the group it creates
   * really is the caller's, which is what these two tests assert instead.
   */
  it("creates the group owned by the CALLER, not by anyone else", async () => {
    const name = `${TEST_PREFIX}authz-addgroup-${newId().slice(0, 8)}`;

    /* Registered before the call so a failed assertion still cleans up. Deleting
     * the group cascades its shared class code. */
    onTestFinished(async () => {
      await testDb()
        .deleteFrom("groups")
        .where("name", "=", name)
        .where("name", "like", `${TEST_PREFIX}%`)
        .execute();
    });

    const result = await teacher.action<{
      success: boolean;
      error: string | null;
      data?: { id: string };
    }>("addGroup", [formData({ name })], { path: SWEEP_PATH });

    expect(result.error).toBe(null);
    expect(result.success).toBe(true);

    const row = await testDb()
      .selectFrom("groups")
      .select(["ownerId", "name"])
      .where("id", "=", result.data!.id)
      .executeTakeFirstOrThrow();

    expect(row.name).toBe(name);
    expect(row.ownerId).toBe(await seededTeacherId());
    expect(row.ownerId).not.toBe(scene.victim.teacherId);
  });

  it("refuses a student caller on role, before creating anything", async () => {
    const name = `${TEST_PREFIX}authz-addgroup-student-${newId().slice(0, 8)}`;

    const result = await outsiderStudent.action<{
      success: boolean;
      error: string | null;
    }>("addGroup", [formData({ name })], { path: SWEEP_PATH });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");

    const groups = await testDb()
      .selectFrom("groups")
      .select("id")
      .where("name", "=", name)
      .execute();
    expect(groups).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Nothing changed                                                             */
/* -------------------------------------------------------------------------- */

type GroupSnapshot = Awaited<ReturnType<typeof snapshotGroup>>;

/**
 * Every row of the victim's world that any swept action could touch.
 *
 * A refusal that had ALREADY WRITTEN something would sail past every assertion
 * above — `fail()` reports the error just the same, and the 404 looks identical.
 * That is not a hypothetical shape for this codebase: STACK.md trap 2 is exactly
 * "a refusal after the first write, returned instead of thrown, COMMITS". So the
 * refusals are checked for what they said, and then the database is checked for
 * what actually happened.
 *
 * Timestamps are omitted on purpose (they would make this brittle for no gain);
 * the columns kept are the ones a broken guard would visibly change.
 */
async function snapshotGroup(groupId: string) {
  const db = testDb();

  return {
    group: await db
      .selectFrom("groups")
      .select([
        "name",
        "description",
        "ownerId",
        "archived",
        "rewardedPoints",
        "publicId",
        "codeMode",
      ])
      .where("id", "=", groupId)
      .executeTakeFirstOrThrow(),

    /* Names come from `users`, which is NOT group-scoped — the only way to notice
     * an unauthorized `editEnrolled`. */
    students: await db
      .selectFrom("enrollments")
      .innerJoin("users", "users.id", "enrollments.userId")
      .select([
        "enrollments.id as enrollmentId",
        "users.id as userId",
        "users.firstName as firstName",
        "users.lastName as lastName",
        "enrollments.points as points",
        "enrollments.currentLocationId as currentLocationId",
      ])
      .where("enrollments.groupId", "=", groupId)
      .orderBy("enrollments.id")
      .execute(),

    kudosTypes: await db
      .selectFrom("kudosTypes")
      .select(["id", "name", "value"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    rewards: await db
      .selectFrom("rewards")
      .select(["id", "name", "cost", "responseRequired", "responsePrompt"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    locations: await db
      .selectFrom("locations")
      .select(["id", "name", "color", "description", "isActive"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    redeemed: await db
      .selectFrom("redeemed")
      .select(["id", "userId", "name", "cost", "reviewed"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    kudos: await db
      .selectFrom("kudos")
      .select(["id", "userId", "name", "value"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    /* Plaintext codes, on purpose: a regenerate that slipped through would change
     * the string while the row count stayed at one. */
    classCodes: await db
      .selectFrom("classCodes")
      .select(["id", "code", "kind", "enrollmentId"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),

    locationHistory: await db
      .selectFrom("locationHistory")
      .select(["id", "userId", "locationId", "duration"])
      .where("groupId", "=", groupId)
      .orderBy("id")
      .execute(),
  };
}

describe("the sweep wrote nothing", () => {
  /*
   * Declared LAST on purpose. Vitest runs a file's tests in declaration order
   * (`sequence.concurrent` is false for this project), so by the time this runs
   * every refusal above has already been issued against these exact rows.
   */
  it("left every one of the victim's rows exactly as it found them", async () => {
    expect(await snapshotGroup(scene.victim.groupId)).toEqual(baseline);
  });
});

/* -------------------------------------------------------------------------- */
/* Completeness                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The four `"use server"` modules whose exports are ownership-scoped.
 *
 * The fifth, `/src/app/pages/user/functions.ts`, is the PRE-AUTHENTICATION
 * boundary — login, signup, password reset. Its exports are meant to be callable
 * with no session, so they are not part of this sweep; their protection is rate
 * limiting and credential checks, tested elsewhere.
 */
const OWNERSHIP_SCOPED_MODULES = [
  "/src/app/components/teacher/functions.ts",
  "/src/app/components/teacher/options/functions.ts",
  "/src/app/components/student/functions.ts",
  "/src/app/components/public/functions.ts",
] as const;

const PRE_AUTH_MODULE = "/src/app/pages/user/functions.ts";

/**
 * Exports deliberately absent from SWEEP, each with the reason.
 *
 * Adding a name here is the only sanctioned way to leave an export uncovered, and
 * it should need a paragraph. There is exactly one.
 */
const EXEMPT = new Map<string, string>([
  [
    "addGroup",
    "Takes no target id. `ownerId` comes from the session, so there is no other " +
      "teacher's group to aim it at and no cross-tenant call to make. Covered " +
      "instead by the `addGroup` describe block, which asserts the group it " +
      "creates is owned by the CALLER.",
  ],
]);

describe("sweep completeness", () => {
  /*
   * Without this the file rots the first time someone adds an endpoint: a new
   * export would simply have no test, and nothing would say so. Every export of
   * the four modules must appear in SWEEP or in EXEMPT, and the failure names the
   * export so the fix is obvious.
   */
  const modules = allActionModules();
  const byPath = new Map(modules.map((m) => [m.modulePath, m]));

  it("aims at all four ownership-scoped modules", () => {
    for (const modulePath of OWNERSHIP_SCOPED_MODULES) {
      expect(
        byPath.get(modulePath),
        `${modulePath} is not a "use server" module any more — it was moved, renamed ` +
          "or lost its directive. Until OWNERSHIP_SCOPED_MODULES is updated, this " +
          "sweep is aimed at nothing.",
      ).toBeDefined();
    }
  });

  it("has no new \"use server\" module nobody has classified", () => {
    /*
     * A fifth action module appearing is the one change this file cannot see from
     * the export lists alone: its exports would not be missing from SWEEP, they
     * would be invisible to the check entirely.
     */
    const known = new Set<string>([...OWNERSHIP_SCOPED_MODULES, PRE_AUTH_MODULE]);
    const unclassified = modules
      .map((m) => m.modulePath)
      .filter((path) => !known.has(path));

    expect(
      unclassified,
      'a new "use server" module exists. Every export of one is a public network ' +
        "endpoint: decide whether its exports are ownership-scoped, add it to " +
        "OWNERSHIP_SCOPED_MODULES (and rows to SWEEP) or document why not.",
    ).toEqual([]);
  });

  it("covers every ownership-scoped export", () => {
    const swept = new Set(SWEEP.map((row) => row.action));

    const missing: string[] = [];
    for (const modulePath of OWNERSHIP_SCOPED_MODULES) {
      for (const name of byPath.get(modulePath)?.exports ?? []) {
        if (!swept.has(name) && !EXEMPT.has(name)) missing.push(`${name} (${modulePath})`);
      }
    }

    expect(
      missing,
      "these exports are network-reachable RSC endpoints with no authorization " +
        "test. Add a row to SWEEP — or, with a written reason, to EXEMPT:\n  " +
        missing.join("\n  "),
    ).toEqual([]);
  });

  it("has no stale rows and no duplicates", () => {
    /* The other direction: a row naming an export that no longer exists would
     * fail confusingly at `actionId()` inside a test body rather than saying so. */
    const real = new Set(
      OWNERSHIP_SCOPED_MODULES.flatMap(
        (modulePath) => byPath.get(modulePath)?.exports ?? [],
      ),
    );

    expect(SWEEP.filter((row) => !real.has(row.action)).map((row) => row.action)).toEqual(
      [],
    );
    expect([...EXEMPT.keys()].filter((name) => !real.has(name))).toEqual([]);

    const seen = new Set<string>();
    const duplicated = SWEEP.map((row) => row.action).filter((name) => {
      if (seen.has(name)) return true;
      seen.add(name);
      return false;
    });
    expect(duplicated).toEqual([]);
  });

  it("assigns every row to the module that actually exports it", () => {
    /* `module` drives nothing at runtime, so it could drift into a lie and mislead
     * the next reader. Pin it to the source. */
    const owner: Record<SweepRow["module"], string> = {
      teacher: "/src/app/components/teacher/functions.ts",
      options: "/src/app/components/teacher/options/functions.ts",
      student: "/src/app/components/student/functions.ts",
      public: "/src/app/components/public/functions.ts",
    };

    const wrong = SWEEP.filter(
      (row) => !byPath.get(owner[row.module])?.exports.includes(row.action),
    ).map((row) => `${row.action} is not exported by ${owner[row.module]}`);

    expect(wrong).toEqual([]);
  });
});

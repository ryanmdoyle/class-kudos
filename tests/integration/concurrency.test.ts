import { describe, expect, it, onTestFinished } from "vitest";

import {
  countKudos,
  countRedeemed,
  openLocationHistory,
  pointsOf,
  testDb,
} from "../helpers/db";
import { TEST_PREFIX } from "../helpers/env";
import {
  seededTeacherId,
  withFixture,
  type FixtureStudent,
} from "../helpers/fixtures";
import {
  assertRealOverlap,
  describeReport,
  inParallel,
  type ParallelReport,
} from "../helpers/parallel";
import { CookieJar, createClient, type Client } from "../helpers/rsc";
import { loginAsStudentInGroup, teacherClient } from "../helpers/session";

import { newId, nowIso } from "@/lib/dbValues";

/**
 * THE RACES THAT LOSE OR DUPLICATE A CHILD'S POINTS.
 *
 * This is the file the suite exists for. Every other test protects a behaviour;
 * these protect the two facts a nine-year-old and their teacher can both see —
 * the balance and the redemption list — from disagreeing with each other.
 *
 * Three separate mechanisms are under test here and they are easy to confuse, so
 * each test names the one it defends:
 *
 *  - THE TRANSACTION decides all-or-nothing. `requestReward`, `cancelRedeemed`,
 *    `applyLocationChange`, `addGroup` and `awardKudos` each write two or three
 *    tables that must land together.
 *  - THE COMPARE-AND-SWAP decides WHO WINS under READ COMMITTED. The
 *    `points >= cost` predicate, the `currentLocationId = <what we read>`
 *    predicate and the `DELETE … RETURNING` are not made redundant by the
 *    transaction (STACK.md §2, "Supabase Postgres, not rwsdk/db") and every
 *    "exactly one winner" assertion below is aimed at one of them.
 *  - THROW-NOT-RETURN is what connects the two. Kysely rolls back only on a
 *    THROWN error (STACK.md trap 2), so a refusal that has already written
 *    something must throw or it silently COMMITS.
 *
 * Which test defends which sentinel, established by mutation rather than by
 * reading — the earlier version of this list was wrong, so do not trust an
 * un-mutated edit to it:
 *
 *    InsufficientPointsError           -> "lets exactly one of five simultaneous
 *                                         redemptions win" AND "leaves the balance
 *                                         untouched…". Note TypeScript also
 *                                         refuses the throw->return edit outright
 *                                         (`points` becomes number|undefined), so
 *                                         this one has two independent defences.
 *    the unrefundable-cancel throw     -> "rolls the delete back when the student
 *                                         is no longer enrolled"
 *    StaleMoveError                    -> "resolves two simultaneous moves to one
 *                                         winner and one arrival row"
 *    cancelRedeemed's bare `return`    -> "refunds exactly once when two cancels
 *      (deliberately correct)             race" pins the idempotence it produces
 *    addGroup's bare `return null`     -> NOTHING. It needs a publicId collision,
 *      (deliberately correct)             which cannot be provoked through the
 *                                         action. Review-only; see that test.
 *
 * "refuses an empty or whitespace-only response" is NOT in that list, though it
 * looks like it belongs: that refusal happens ABOVE `db.transaction()` and
 * contains no throw at all, so no throw->return mutation can make it fail. Its
 * real job is pinning that the response check stays above the transaction.
 *
 * Every race test calls `assertOverlapped`, and it proves LESS than it appears to
 * — read the header of tests/helpers/parallel.ts before relying on it.
 * `maxConcurrent` shows the requests were in flight from the client, not that the
 * server interleaved them; `overlapFactor` is the serialisation canary. What
 * actually establishes that these tests exercise the compare-and-swaps is
 * MUTATION TESTING, and the mapping above is its output. Re-run it if you change
 * a race.
 *
 * Every race is also warmed by a call that COMMITS, not merely one that is
 * refused: a refusal-shaped warm-up returns above `db.transaction()` and leaves
 * the first racing request to pay the cold connection and first-transaction cost,
 * which is the stagger the warm-up exists to remove.
 */

/* ------------------------------------------------------------------ shapes */

/*
 * Declared locally rather than imported. `@/app/components/**` reaches
 * `cloudflare:workers` through `@/db`, which does not resolve outside the
 * Worker — the same rule tests/helpers/db.ts documents at length. These three
 * shapes are the action contract; if one drifts, the assertions below fail on
 * the wire, which is where we want to find out.
 */
type RequestRewardResult =
  | { ok: true; points: number }
  | { ok: false; error: string };

type LocationChangeResult =
  | {
      ok: true;
      locationId: string | null;
      locationName: string | null;
      locationColor: string | null;
    }
  | { ok: false; error: string };

type ActionResult<T = null> = {
  success: boolean;
  error: string | null;
  data?: T;
};

/* ----------------------------------------------------------------- helpers */

/**
 * `assertRealOverlap`, with the report summary appended.
 *
 * A CI failure here is only actionable if it says whether the requests
 * overlapped and by how much, and the raw helper deliberately does not know
 * about `describeReport`.
 */
function assertOverlapped(report: ParallelReport<unknown>): void {
  try {
    assertRealOverlap(report);
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n` +
        `  report: ${describeReport(report)}`,
    );
  }
}

/**
 * N independent clients sharing ONE session cookie.
 *
 * This is what a child double-tapping a button actually looks like: one session,
 * several in-flight requests. Each client gets its own CF-Connecting-IP so the
 * rate-limit budgets stay private (they are keyed on the IP, not the session),
 * and a separate client per request is the only way to get real concurrency at
 * all — `src/db/index.ts` keys its `max: 1` pool on the Request object, so N
 * promises inside one request queue on one connection and no race happens.
 */
function sharedSessionClients(sessionId: string, count: number): Client[] {
  return Array.from({ length: count }, () => createClient({ jar: cookieFor(sessionId) }));
}

/** A jar holding one session cookie, for a client that must share a session. */
function cookieFor(sessionId: string): CookieJar {
  const jar = new CookieJar();
  jar.set("session_id", sessionId);
  return jar;
}

/** The group's display counter, which `awardKudos` bumps as its third write. */
async function rewardedPointsOf(groupId: string): Promise<number> {
  const row = await testDb()
    .selectFrom("groups")
    .select("rewardedPoints")
    .where("id", "=", groupId)
    .executeTakeFirstOrThrow();
  return row.rewardedPoints;
}

/** Every history row for a group, oldest arrival first. */
async function historyOf(groupId: string) {
  return testDb()
    .selectFrom("locationHistory")
    .selectAll()
    .where("groupId", "=", groupId)
    .orderBy("arrivedAt", "asc")
    .execute();
}

/** The one redemption row a fixture test has just created. */
async function soleRedemption(groupId: string) {
  const rows = await testDb()
    .selectFrom("redeemed")
    .select(["id", "userId", "cost", "name"])
    .where("groupId", "=", groupId)
    .execute();
  expect(rows, "setup expected exactly one redemption row").toHaveLength(1);
  return rows[0]!;
}

const INSUFFICIENT = (cost: number) => `You need ${cost} kudos for that. Keep going!`;
const REWARD_GONE = "That reward isn't available any more.";
const STALE_MOVE = "Someone just moved that student. Please refresh and try again.";
const CODE_ALPHABET = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/* ========================================================================== */
/* Redemption                                                                  */
/* ========================================================================== */

describe("requestReward under concurrency", () => {
  /**
   * The double-tap. Five requests, a balance that affords EXACTLY ONE.
   *
   * This is the test the `points >= cost` predicate in the UPDATE's WHERE clause
   * exists for. Under READ COMMITTED all five UPDATEs reach the same row; four
   * block on the row lock, re-evaluate the predicate against the committed
   * balance of 0 and match nothing. Delete that predicate — "the transaction
   * covers it" — and five deductions commit, the balance goes to -40, and five
   * redemptions appear for one reward.
   *
   * The FOUR SPECIFIC REFUSALS matter as much as the one success: they are what
   * distinguishes "the compare-and-swap rejected them" from "they never ran".
   */
  it("lets exactly one of five simultaneous redemptions win", async () => {
    const cost = 10;
    const f = await withFixture({
      students: 1,
      /* cost twice over: one to spend warming the write path, one for the race. */
      points: cost * 2,
      rewards: [["Sit anywhere", cost]],
      label: "race-redeem",
    });
    const student = f.students[0]!;
    const reward = f.rewards[0]!;

    const session = (
      await loginAsStudentInGroup(f.sharedCode!, student.userId)
    ).jar.sessionId!;

    /*
     * Warm the path with a redemption that COMMITS.
     *
     * A refusal-shaped warm-up (an unknown reward id) looked cheaper and warmed
     * the wrong thing: `requestReward` refuses that ABOVE `db.transaction()`, so
     * the first request to actually open a transaction was still the cold one —
     * which is exactly the per-request connection and first-transaction cost that
     * staggers the race and can stop it racing at all.
     *
     * So spend a real kudos here, then put the balance back to exactly `cost` with
     * testDb() so the race arithmetic still admits exactly one winner.
     */
    const warm = await createClient({ jar: cookieFor(session) }).action<RequestRewardResult>(
      "requestReward",
      [{ groupId: f.groupId, rewardId: reward.id }],
    );
    expect(warm).toEqual({ ok: true, points: cost });
    expect(await countRedeemed(f.groupId)).toBe(1);

    await testDb()
      .deleteFrom("redeemed")
      .where("groupId", "=", f.groupId)
      .execute();
    await testDb()
      .updateTable("enrollments")
      .set({ points: cost })
      .where("id", "=", student.enrollmentId)
      .execute();
    expect(await pointsOf(student.enrollmentId)).toBe(cost);
    expect(await countRedeemed(f.groupId)).toBe(0);

    const clients = sharedSessionClients(session, 5);
    const report = await inParallel(5, (index) =>
      clients[index]!.action<RequestRewardResult>("requestReward", [
        { groupId: f.groupId, rewardId: reward.id },
      ]),
    );

    /* A rejected attempt is an HTTP-level failure, not a refusal — never expected. */
    expect(report.rejected, describeReport(report)).toEqual([]);
    assertOverlapped(report);

    const winners = report.fulfilled.filter((r) => r.ok);
    const losers = report.fulfilled.filter((r) => !r.ok);

    expect(winners, describeReport(report)).toEqual([{ ok: true, points: 0 }]);
    expect(losers).toHaveLength(4);
    for (const loser of losers) {
      expect(loser).toEqual({ ok: false, error: INSUFFICIENT(cost) });
    }

    /* The database is the only witness that matters. */
    expect(await countRedeemed(f.groupId)).toBe(1);
    const balance = await pointsOf(student.enrollmentId);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  /**
   * A refusal must not be a silent success.
   *
   * `InsufficientPointsError` is THROWN from inside the transaction callback and
   * turned back into a result outside it (STACK.md trap 2). If it were a plain
   * `return { ok: false, … }` the callback's value would become `points`, the
   * function would answer `{ ok: true, points: { ok: false, … } }`, and the
   * child would be told their reward was granted while the teacher's list stayed
   * empty. This test asserts the refusal reaches the caller AS a refusal, with
   * the exact wording, and that nothing was written on the way.
   *
   * The deduction here matched no row, so there is nothing to roll back — the
   * corrupting version of that trap is tests 5 and 6 below, where a `return`
   * would commit a delete or an audit row. Together they pin the whole rule.
   */
  it("leaves the balance untouched when the child cannot afford the reward", async () => {
    const f = await withFixture({
      students: 1,
      points: 5,
      rewards: [["Sit anywhere", 10]],
      label: "poor-redeem",
    });
    const student = f.students[0]!;

    const client = await loginAsStudentInGroup(f.sharedCode!, student.userId);

    const result = await client.action<RequestRewardResult>("requestReward", [
      { groupId: f.groupId, rewardId: f.rewards[0]!.id },
    ]);

    expect(result).toEqual({ ok: false, error: INSUFFICIENT(10) });
    expect(await pointsOf(student.enrollmentId)).toBe(5);
    expect(await countRedeemed(f.groupId)).toBe(0);
  });

  /**
   * The same invariant for the response-required refusal.
   *
   * This one returns BEFORE the transaction opens, which is why a `return` is
   * legal there — and that placement is exactly what the test pins. Move the
   * check below the guarded deduction and it becomes a refusal that has already
   * written, at which point the `return` starts committing a deduction for a
   * request the child was told to redo.
   *
   * Whitespace is checked separately because the refusal is decided on the
   * TRIMMED response: "   " must be treated as no answer, not as an answer.
   */
  it("refuses an empty or whitespace-only response without charging anything", async () => {
    const f = await withFixture({
      students: 1,
      points: 10,
      rewards: [["Ask a question", 5, true]],
      label: "prompt-redeem",
    });
    const student = f.students[0]!;
    const reward = f.rewards[0]!;
    expect(reward.responseRequired).toBe(true);

    const client = await loginAsStudentInGroup(f.sharedCode!, student.userId);

    /* withFixture sets this prompt for any responseRequired reward. */
    const prompt = `Why do you deserve ${reward.name}?`;

    const omitted = await client.action<RequestRewardResult>("requestReward", [
      { groupId: f.groupId, rewardId: reward.id },
    ]);
    expect(omitted).toEqual({ ok: false, error: prompt });

    const blank = await client.action<RequestRewardResult>("requestReward", [
      { groupId: f.groupId, rewardId: reward.id, response: "   \t\n " },
    ]);
    expect(blank).toEqual({ ok: false, error: prompt });

    expect(await pointsOf(student.enrollmentId)).toBe(10);
    expect(await countRedeemed(f.groupId)).toBe(0);
  });
});

/* ========================================================================== */
/* Cancelling a redemption                                                     */
/* ========================================================================== */

describe("cancelRedeemed under concurrency", () => {
  /**
   * Two teachers (or one double-click) cancelling the same redemption.
   *
   * The `DELETE … RETURNING` is the compare-and-swap: both cancels pass the
   * authorization SELECT, exactly one gets a row back, and the refund is gated
   * on having WON the delete rather than on that earlier read. The shape this
   * replaced — SELECT, unguarded DELETE, refund — refunded twice and recorded
   * nothing, handing the child a free `cost` worth of points.
   *
   * Both calls reporting success is CORRECT, not a leak: the loser's bare
   * `return` commits an empty transaction because its DELETE matched nothing, so
   * there is no write to undo and nothing for the teacher to retry. Idempotence
   * is the intended behaviour and this test pins it — the assertion that catches
   * a second refund is the BALANCE, not the result.
   *
   * The redemption is created through a real `requestReward` rather than
   * inserted with testDb(): the refund is `points + cost` against a balance the
   * app itself produced, so a mismatch between what redemption charges and what
   * cancellation returns cannot hide behind hand-written setup.
   */
  it("refunds exactly once when two cancels race", async () => {
    const cost = 10;
    /*
     * TWO students, not one, and the second one never redeems anything.
     *
     * With a single-student group the refund's WHERE clause could be widened from
     * `userId + groupId` to `groupId` alone and this test would still pass — there
     * would be nobody else to credit by mistake. A classmate who is merely present
     * makes "refunded the right child" an assertion rather than an assumption.
     */
    const f = await withFixture({
      students: 2,
      points: cost,
      rewards: [["Sit anywhere", cost]],
      label: "race-cancel",
    });
    const student = f.students[0]!;
    const bystander = f.students[1]!;

    const studentSession = await loginAsStudentInGroup(
      f.sharedCode!,
      student.userId,
    );
    const spent = await studentSession.action<RequestRewardResult>("requestReward", [
      { groupId: f.groupId, rewardId: f.rewards[0]!.id },
    ]);
    expect(spent).toEqual({ ok: true, points: 0 });
    expect(await pointsOf(student.enrollmentId)).toBe(0);

    /*
     * Warm `cancelRedeemed` through its TRANSACTION, on a throwaway redemption.
     *
     * A missing-id warm-up refuses at `ErrorResponse(404)` above
     * `db.transaction()`, so it never opened one — leaving the first request of the
     * race to pay the cold connection and first-transaction cost, which is the
     * stagger that can stop the two cancels from actually overlapping.
     *
     * This throwaway row is inserted directly so warming does not depend on
     * `requestReward`, and cancelling it exercises the real delete-and-refund.
     */
    const throwaway = newId();
    await testDb()
      .insertInto("redeemed")
      .values({
        id: throwaway,
        userId: student.userId,
        groupId: f.groupId,
        name: "Warm-up",
        cost: 0,
        response: null,
        reviewed: false,
        reviewedAt: null,
        createdAt: nowIso(),
      })
      .execute();

    const warm = await (await teacherClient()).action<ActionResult>("cancelRedeemed", [
      throwaway,
    ]);
    expect(warm).toEqual({ success: true, error: null, data: undefined });
    /* cost 0, so the balance is untouched and the race arithmetic is unchanged. */
    expect(await pointsOf(student.enrollmentId)).toBe(0);

    const redemption = await soleRedemption(f.groupId);

    const teachers = [await teacherClient(), await teacherClient()];
    const report = await inParallel(2, (index) =>
      teachers[index]!.action<ActionResult>("cancelRedeemed", [redemption.id]),
    );

    expect(report.rejected, describeReport(report)).toEqual([]);
    assertOverlapped(report);

    for (const result of report.fulfilled) {
      expect(result, describeReport(report)).toEqual({
        success: true,
        error: null,
        data: undefined,
      });
    }

    /* +cost once, not twice. This is the whole point of the test. */
    expect(await pointsOf(student.enrollmentId)).toBe(cost);
    expect(await countRedeemed(f.groupId)).toBe(0);

    /*
     * And it landed on the child who spent them. Without this, widening the
     * refund's WHERE clause from `userId + groupId` to `groupId` alone would still
     * pass every other assertion above while crediting the wrong child.
     */
    expect(
      await pointsOf(bystander.enrollmentId),
      "the refund credited a classmate who never redeemed anything",
    ).toBe(cost);
  });

  /**
   * !! THE MOST IMPORTANT ASSERTION IN THE SUITE. !!
   *
   * `redeemed` has foreign keys to `users` and `groups` but NEVER to
   * `enrollments`, so un-enrolling a child leaves their redemption rows behind
   * with no enrollment for a refund to land on. Postgres does not error on an
   * UPDATE that matches zero rows, so without the `.returning` check the DELETE
   * would commit with no refund: the redemption vanishes, the points are never
   * returned, and the action reports success.
   *
   * The refusal therefore THROWS, which rolls the DELETE back — and the row
   * still being here is the proof that points are never minted for free and
   * never quietly destroyed. If this test ever fails, the transaction boundary
   * or the throw has been broken, and the failure is silent in production: a
   * teacher sees "cancelled" and a child sees nothing.
   *
   * The enrollment is deleted with testDb() rather than through
   * `removeEnrollment` so this test cannot fail because of a bug in that action.
   */
  it("rolls the delete back when the student is no longer enrolled", async () => {
    const cost = 10;
    /*
     * TWO students, for the same reason as the race test above: with only the
     * redeeming child in the group, the refund's `userId` predicate is pinned by
     * nothing. Here it matters more than usual — once that child is un-enrolled,
     * a refund scoped to `groupId` alone would find the CLASSMATE's enrollment,
     * match a row, and let the cancel "succeed": the redemption would be deleted
     * and the points handed to the wrong child. The bystander is what makes that
     * observable.
     */
    const f = await withFixture({
      students: 2,
      points: cost,
      rewards: [["Sit anywhere", cost]],
      label: "cancel-unenrolled",
    });
    const student = f.students[0]!;
    const bystander = f.students[1]!;

    const studentSession = await loginAsStudentInGroup(
      f.sharedCode!,
      student.userId,
    );
    expect(
      await studentSession.action<RequestRewardResult>("requestReward", [
        { groupId: f.groupId, rewardId: f.rewards[0]!.id },
      ]),
    ).toEqual({ ok: true, points: 0 });

    const redemption = await soleRedemption(f.groupId);

    await testDb()
      .deleteFrom("enrollments")
      .where("id", "=", student.enrollmentId)
      .execute();

    const result = await (await teacherClient()).action<ActionResult>(
      "cancelRedeemed",
      [redemption.id],
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(
      /^Cannot cancel: .+ is no longer enrolled in .+, so the \d+ kudos could not be refunded\. Re-enrol the student first\.$/,
    );

    /* The delete rolled back. Nothing was minted, nothing was lost. */
    expect(await countRedeemed(f.groupId)).toBe(1);
    const survivor = await testDb()
      .selectFrom("redeemed")
      .select(["id", "cost"])
      .where("id", "=", redemption.id)
      .executeTakeFirst();
    expect(survivor).toEqual({ id: redemption.id, cost });

    /*
     * And the classmate was not paid for someone else's redemption. Without this,
     * a refund scoped to `groupId` alone would credit them, the refusal branch
     * would never fire, and the redemption would be deleted.
     */
    expect(
      await pointsOf(bystander.enrollmentId),
      "the refund landed on a classmate after the redeeming child was un-enrolled",
    ).toBe(cost);
  });
});

/* ========================================================================== */
/* Moving a student                                                            */
/* ========================================================================== */

describe("setMyLocation under concurrency", () => {
  /**
   * One child, one previous location, two simultaneous destinations.
   *
   * `applyLocationChange` writes three rows in one transaction — close the old
   * history row, open the new one, then compare-and-swap
   * `enrollments.currentLocationId` against the value it read. The CAS is last
   * on purpose: the loser has ALREADY written both audit rows when it discovers
   * it lost, so it must throw (`StaleMoveError`) to unwind them. A `return`
   * there commits a departure and an arrival that never happened, and the
   * travel log — the thing a teacher shows a parent — grows a second child in
   * two rooms at once.
   *
   * So the assertion that matters is not the refusal string, it is
   * EXACTLY ONE new arrival row.
   */
  it("resolves two simultaneous moves to one winner and one arrival row", async () => {
    const f = await withFixture({
      students: 1,
      locations: ["Library", "Gym", "Nurse"],
      label: "race-move",
    });
    const student = f.students[0]!;
    const library = f.locations[0]!;
    const gym = f.locations[1]!;
    const nurse = f.locations[2]!;

    const session = (
      await loginAsStudentInGroup(f.sharedCode!, student.userId)
    ).jar.sessionId!;

    /*
     * The move to Library is both the warm-up and the setup: it compiles the
     * path, makes `previousLocationId` non-null and leaves an OPEN history row —
     * without which the losing request would have no departure write to roll
     * back and the test would only be half of itself.
     */
    const first = await createClient({ jar: cookieFor(session) }).action<LocationChangeResult>(
      "setMyLocation",
      [{ groupId: f.groupId, locationId: library.id }],
    );
    expect(first.ok).toBe(true);

    const afterFirst = await historyOf(f.groupId);
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]!.locationId).toBe(library.id);
    expect(afterFirst[0]!.leftAt).toBeNull();

    const destinations = [gym.id, nurse.id];
    const clients = sharedSessionClients(session, 2);
    const report = await inParallel(2, (index) =>
      clients[index]!.action<LocationChangeResult>("setMyLocation", [
        { groupId: f.groupId, locationId: destinations[index]! },
      ]),
    );

    expect(report.rejected, describeReport(report)).toEqual([]);
    assertOverlapped(report);

    const winners = report.fulfilled.filter((r) => r.ok);
    const losers = report.fulfilled.filter((r) => !r.ok);
    expect(winners, describeReport(report)).toHaveLength(1);
    expect(losers, describeReport(report)).toEqual([
      { ok: false, error: STALE_MOVE },
    ]);

    const winner = winners[0]!;
    expect(destinations).toContain(winner.locationId);

    const history = await historyOf(f.groupId);
    /* Library + the winner's arrival. The loser's two writes unwound. */
    expect(history).toHaveLength(2);

    const closed = history[0]!;
    expect(closed.locationId).toBe(library.id);
    expect(closed.leftAt).not.toBeNull();
    expect(Number.isInteger(closed.duration)).toBe(true);
    expect(closed.duration!).toBeGreaterThanOrEqual(0);

    const arrival = history[1]!;
    expect(arrival.locationId).toBe(winner.locationId);
    expect(arrival.leftAt).toBeNull();
    expect(arrival.duration).toBeNull();

    /* And the child is shown in exactly the place the winner moved them to. */
    const enrollment = await testDb()
      .selectFrom("enrollments")
      .select("currentLocationId")
      .where("id", "=", student.enrollmentId)
      .executeTakeFirstOrThrow();
    expect(enrollment.currentLocationId).toBe(winner.locationId);
  });

  /**
   * Tapping the room you are already in must do NOTHING.
   *
   * `applyLocationChange` short-circuits when `previousLocationId === locationId`,
   * returning before it opens a transaction — one of the bare returns that module
   * documents as deliberately correct. Nothing else in the suite exercises it, so
   * the short-circuit could be deleted outright and everything stayed green.
   *
   * What deleting it actually does, which is why this is worth a test: all three
   * writes then run for a no-op tap. Write 1 closes the child's open history row
   * with `duration: 0`, write 2 inserts a SECOND arrival for the same room, and
   * the compare-and-swap still matches because `currentLocationId` already equals
   * `previousLocationId` — so the transaction commits. The travel log gains a
   * spurious zero-minute visit every time a child double-taps the room they are
   * standing in, and the log is the feature.
   */
  it("does nothing when a child taps the room they are already in", async () => {
    const f = await withFixture({
      students: 1,
      locations: ["Library", "Classroom"],
      label: "same-location-tap",
    });
    const student = f.students[0]!;
    const library = f.locations[0]!;

    const session = await loginAsStudentInGroup(f.sharedCode!, student.userId);

    const first = await session.action<LocationChangeResult>("setMyLocation", [
      { groupId: f.groupId, locationId: library.id },
    ]);
    expect(first).toMatchObject({ ok: true, locationId: library.id });
    expect(await historyOf(f.groupId)).toHaveLength(1);

    /* The same room again. Reported as success — it IS the current state. */
    const second = await session.action<LocationChangeResult>("setMyLocation", [
      { groupId: f.groupId, locationId: library.id },
    ]);
    expect(second).toEqual({
      ok: true,
      locationId: library.id,
      locationName: library.name,
      locationColor: library.color,
    });

    const history = await historyOf(f.groupId);
    expect(
      history,
      "the idempotent short-circuit is gone: a no-op tap wrote a second arrival",
    ).toHaveLength(1);

    const only = history[0]!;
    expect(only.locationId).toBe(library.id);
    expect(
      only.leftAt,
      "the child's open visit was closed by a tap that changed nothing",
    ).toBeNull();
    expect(only.duration).toBeNull();

    const enrollment = await testDb()
      .selectFrom("enrollments")
      .select("currentLocationId")
      .where("id", "=", student.enrollmentId)
      .executeTakeFirstOrThrow();
    expect(enrollment.currentLocationId).toBe(library.id);
  });

  /**
   * Retiring a location must close every visit still open at it.
   *
   * `deleteLocation` is a soft delete with three writes whose ORDER is the
   * invariant: the open `locationHistory` rows have to be closed BEFORE
   * `enrollments.currentLocationId` is cleared, because `applyLocationChange`
   * only ever closes a row when `previousLocationId !== null` and nothing else in
   * the app closes one at all.
   *
   * So if the closing loop is removed, every child standing at the retired
   * location keeps a `leftAt: null` row that can never be closed by anything —
   * the travel log shows them permanently in a room that no longer exists, and no
   * later action can repair it. The comment in the action states this; until now
   * nothing checked it.
   */
  it("closes open visits before clearing the children standing there", async () => {
    const f = await withFixture({
      students: 2,
      locations: ["Library"],
      label: "delete-location",
    });
    const [first, second] = f.students as [FixtureStudent, FixtureStudent];
    const library = f.locations[0]!;

    for (const student of [first, second]) {
      const session = await loginAsStudentInGroup(f.sharedCode!, student.userId);
      const moved = await session.action<LocationChangeResult>("setMyLocation", [
        { groupId: f.groupId, locationId: library.id },
      ]);
      expect(moved).toMatchObject({ ok: true, locationId: library.id });
    }
    expect(await openLocationHistory(f.groupId)).toHaveLength(2);

    const result = await (await teacherClient()).action<ActionResult>(
      "deleteLocation",
      [library.id],
    );
    expect(result).toEqual({ success: true, error: null, data: undefined });

    /* Nothing is still open at the retired location. */
    expect(
      await openLocationHistory(f.groupId),
      "children were left permanently at a location that no longer exists",
    ).toEqual([]);

    const history = await historyOf(f.groupId);
    /* Soft delete: the rows are CLOSED, never removed. The log is the feature. */
    expect(history).toHaveLength(2);
    for (const row of history) {
      expect(row.locationId).toBe(library.id);
      expect(row.leftAt).not.toBeNull();
      expect(Number.isInteger(row.duration)).toBe(true);
      expect(row.duration!).toBeGreaterThanOrEqual(0);
    }

    /* And both children are shown as back in class. */
    const enrollments = await testDb()
      .selectFrom("enrollments")
      .select(["id", "currentLocationId"])
      .where("groupId", "=", f.groupId)
      .execute();
    for (const enrollment of enrollments) {
      expect(enrollment.currentLocationId).toBeNull();
    }

    /* Soft, not hard: the location row survives, deactivated. */
    const location = await testDb()
      .selectFrom("locations")
      .select(["id", "isActive"])
      .where("id", "=", library.id)
      .executeTakeFirstOrThrow();
    expect(location).toEqual({ id: library.id, isActive: false });
  });
});

/* ========================================================================== */
/* All-or-nothing writes                                                       */
/* ========================================================================== */

/*
 * NAMED FOR WHAT IT CHECKS, not for what it would be nice to check.
 *
 * These observe that every write of a multi-table action LANDS — the group and its
 * code, the ledger row and the balance and the counter, the user and the enrolment
 * and the code. None of them injects a mid-transaction failure, so none of them
 * observes ROLLBACK, and calling the block "transaction atomicity" implied a
 * guarantee it does not deliver: dropping the `db.transaction()` wrapper from
 * `awardKudos` and running its three statements on the ambient `db` would leave
 * every test in here green.
 *
 * Forcing a realistic fault through a public action means contriving one (an
 * over-long name, a constraint chosen for its side effect), which tests the
 * contrivance as much as the code. The rollback behaviour that genuinely matters is
 * covered where it is reachable and consequential instead — the un-enrolled cancel,
 * and the losing side of each race.
 */
describe("multi-table writes all land", () => {
  /**
   * A group and its class code commit together or not at all.
   *
   * A group with no class code is a group NO STUDENT CAN JOIN, and it is
   * invisible on the dashboard — the teacher sees their new class and only finds
   * out at the start of a lesson. `ensureGroupCode` is handed the `trx` for
   * exactly this reason (and because on the ambient `db` it would ask the
   * `max: 1` pool for a second connection the transaction is holding and HANG
   * the request rather than merely escaping the transaction).
   *
   * The code alphabet is asserted too: these are typed by children off printed
   * paper, so a 6-symbol code from the 30-glyph confusable-free alphabet is part
   * of the contract, not an implementation detail.
   */
  it("creates a group and its shared code in one unit", async () => {
    const name = `${TEST_PREFIX}addgroup-${crypto.randomUUID().slice(0, 8)}`;

    /*
     * Teardown FIRST, keyed on the name rather than the returned id.
     *
     * Registering it after the assertions — the obvious order — is inverted
     * against the failure this test exists to catch: if `addGroup` commits the
     * group and then fails, the first `expect` throws, `onTestFinished` is never
     * reached, and the half-created group leaks. Keying on the name works because
     * the name is known before the call, and the TEST_PREFIX guard means this can
     * only ever match a row this harness made.
     */
    onTestFinished(async () => {
      await testDb()
        .deleteFrom("groups")
        .where("name", "=", name)
        .where("name", "like", `${TEST_PREFIX}%`)
        .execute();
    });

    const formData = new FormData();
    formData.set("name", name);

    const result = await (await teacherClient()).action<ActionResult<{ id: string }>>(
      "addGroup",
      [formData],
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const groupId = result.data!.id;

    const group = await testDb()
      .selectFrom("groups")
      .select([
        "id",
        "name",
        "ownerId",
        "codeMode",
        "archived",
        "rewardedPoints",
        "publicId",
      ])
      .where("id", "=", groupId)
      .executeTakeFirstOrThrow();

    const { publicId, ...rest } = group;
    expect(rest).toEqual({
      id: groupId,
      name,
      ownerId: await seededTeacherId(),
      codeMode: "shared",
      archived: false,
      rewardedPoints: 0,
    });
    /* nanoid(6) — the public travel-log URL, so its shape is part of the contract. */
    expect(publicId).toMatch(/^[A-Za-z0-9_-]{6}$/);

    const codes = await testDb()
      .selectFrom("classCodes")
      .select(["code", "codeHash", "kind", "enrollmentId"])
      .where("groupId", "=", groupId)
      .execute();

    /* Exactly one, and it is the GROUP-wide one: kind "group", no enrollment. */
    expect(codes).toHaveLength(1);
    expect(codes[0]!.kind).toBe("group");
    expect(codes[0]!.enrollmentId).toBeNull();
    expect(codes[0]!.code).toMatch(CODE_ALPHABET);
    expect(codes[0]!.codeHash).toMatch(/^[0-9a-f]{64}$/);

    /*
     * NOT COVERED, and stated rather than implied: `addGroup`'s retry loop and its
     * `if (!inserted) return null` — the one bare return trap 2 calls
     * correct-only-here — are unreachable from a test. They need a `publicId`
     * collision, and nanoid(6) does not collide in a test run (fixtures use
     * 12-char publicIds precisely so they never provoke it). Changing that
     * `return null` to a `throw` would look more careful, satisfy "every refusal
     * below the first write must throw", be WRONG — the retry would die with
     * "current transaction is aborted" — and break nothing here. Those two lines
     * are review-only.
     */
  });

  /**
   * A student, their enrolment and their class code arrive together.
   *
   * `createNewStudents` writes `users`, `enrollments` and — in individual code
   * mode — one class code per new child, in a single transaction. Nothing outside
   * the authorization sweep touched it before, which left the most dangerous line
   * in it unpinned: the trailing `trx` on
   * `issueStudentCodesForGroup(groupId, { onlyMissing: true }, trx)`.
   *
   * Drop that argument and the helper falls back to its `executor = db` default,
   * which asks the request's `max: 1` pool for a SECOND connection that the open
   * transaction is holding. That is trap 1, and the failure mode is not a wrong
   * answer — the request HANGS until the runtime kills it, which a reader
   * skim-reading the call would never predict. The per-request 20s abort in the
   * harness is what turns that hang into a legible failure here.
   */
  it("creates a student, an enrolment and a code together", async () => {
    const f = await withFixture({
      students: 1,
      codeMode: "individual",
      individualCodes: true,
      label: "new-students",
    });

    const before = await testDb()
      .selectFrom("enrollments")
      .select("id")
      .where("groupId", "=", f.groupId)
      .execute();
    expect(before).toHaveLength(1);

    const result = await (await teacherClient()).action<
      ActionResult<{ created: number }>
    >("createNewStudents", [
      f.groupId,
      [
        { firstName: "Mallory", lastName: "Newcomer" },
        { firstName: "Trent", lastName: "Newcomer" },
      ],
    ]);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ created: 2 });

    /* users + enrollments: three children in the class now. */
    const enrollments = await testDb()
      .selectFrom("enrollments")
      .innerJoin("users", "users.id", "enrollments.userId")
      .select([
        "enrollments.id as enrollmentId",
        "enrollments.points as points",
        "users.firstName as firstName",
        "users.role as role",
        "users.email as email",
        "users.username as username",
      ])
      .where("enrollments.groupId", "=", f.groupId)
      .execute();

    expect(enrollments).toHaveLength(3);
    const added = enrollments.filter((row) => row.firstName !== "Ada");
    expect(added).toHaveLength(2);
    for (const row of added) {
      expect(row.role).toBe("STUDENT");
      expect(row.points).toBe(0);
      /* v2 students have no credentials of their own — a code IS the credential. */
      expect(row.email).toBeNull();
      expect(row.username).toBeNull();
    }

    /*
     * And in individual mode every new child got a code. This is the assertion the
     * dropped-`trx` mutation cannot satisfy: without the transaction handle the
     * call deadlocks and never reaches here.
     */
    const codes = await testDb()
      .selectFrom("classCodes")
      .select(["kind", "enrollmentId", "code"])
      .where("groupId", "=", f.groupId)
      .where("kind", "=", "student")
      .execute();

    const enrolledIds = new Set(enrollments.map((row) => row.enrollmentId));
    expect(codes).toHaveLength(3);
    for (const code of codes) {
      expect(code.enrollmentId).not.toBeNull();
      expect(enrolledIds.has(code.enrollmentId!)).toBe(true);
      expect(code.code).toMatch(CODE_ALPHABET);
    }
    /* One per enrolment, never two — classCodes has a unique index on enrollmentId. */
    expect(new Set(codes.map((c) => c.enrollmentId)).size).toBe(3);
  });

  /**
   * `awardKudos` spans three tables and this is the most-used write in the app.
   *
   * The ledger is what a teacher points at when a child asks why their total is
   * what it is, so a `kudos` row whose points were never applied — or a balance
   * with no ledger row behind it — is not "partially saved", it is two things
   * the child can see disagreeing. All three writes are asserted, including the
   * group's display counter, and the untargeted student is asserted UNCHANGED so
   * a widened WHERE clause cannot pass this test.
   */
  it("applies ledger rows, balances and the group counter together", async () => {
    const value = 3;
    const f = await withFixture({
      students: 3,
      points: 0,
      kudosTypes: [["On task", value]],
      label: "award",
    });
    const ada = f.students[0]!;
    const grace = f.students[1]!;
    const alan = f.students[2]!;

    const result = await (await teacherClient()).action<ActionResult<{ awarded: number }>>(
      "awardKudos",
      [f.groupId, f.kudosTypes[0]!.id, [ada.enrollmentId, grace.enrollmentId]],
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ awarded: 2 });

    expect(await countKudos(f.groupId)).toBe(2);
    const ledger = await testDb()
      .selectFrom("kudos")
      .select(["userId", "name", "value"])
      .where("groupId", "=", f.groupId)
      .execute();
    expect(ledger.map((row) => row.userId).sort()).toEqual(
      [ada.userId, grace.userId].sort(),
    );
    for (const row of ledger) {
      expect(row).toMatchObject({ name: "On task", value });
    }

    expect(await pointsOf(ada.enrollmentId)).toBe(value);
    expect(await pointsOf(grace.enrollmentId)).toBe(value);
    /* Not selected, so not credited. */
    expect(await pointsOf(alan.enrollmentId)).toBe(0);

    expect(await rewardedPointsOf(f.groupId)).toBe(value * 2);
  });

  /**
   * An enrollment id from outside the group is DROPPED, not an error.
   *
   * The selection is re-resolved against the database (`groupId` + `id in (…)`),
   * which is the authorization boundary: a crafted id cannot credit a child in
   * another teacher's class. The observable consequence is that `awarded` counts
   * the RE-RESOLVED rows, and — the part worth pinning — `rewardedPoints` is
   * bumped by `value * enrollments.length`, so a dropped id must not inflate the
   * counter either. If the count were ever taken from the request instead, both
   * numbers would quietly go wrong at once.
   */
  it("silently drops an enrollment id that is not in the group", async () => {
    const value = 2;
    const f = await withFixture({
      students: 1,
      points: 0,
      kudosTypes: [["On task", value]],
      label: "award-foreign",
    });
    const student = f.students[0]!;

    /*
     * A REAL enrollment in a DIFFERENT class, not a random uuid.
     *
     * `awardKudos` re-resolves the ids it was given with
     * `where("groupId","=",groupId).where("id","in",enrollmentIds)` — that `groupId`
     * predicate IS the authorization boundary for this action. A random uuid matches
     * nothing whether or not the predicate is there, so it cannot detect its removal.
     * A live enrollment belonging to someone else's class can: drop the `groupId`
     * scope and this child is awarded points in a class they are not in.
     */
    const other = await withFixture({
      students: 1,
      points: 0,
      label: "award-foreign-other",
    });
    const outsider = other.students[0]!;

    const result = await (await teacherClient()).action<ActionResult<{ awarded: number }>>(
      "awardKudos",
      [
        f.groupId,
        f.kudosTypes[0]!.id,
        [student.enrollmentId, outsider.enrollmentId, crypto.randomUUID()],
      ],
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ awarded: 1 });

    expect(await countKudos(f.groupId)).toBe(1);
    expect(await pointsOf(student.enrollmentId)).toBe(value);
    /* value * 1, not value * 2. */
    expect(await rewardedPointsOf(f.groupId)).toBe(value);

    /* The other class is untouched: no kudos row, no points, no counter bump. */
    expect(
      await pointsOf(outsider.enrollmentId),
      "a child in another class was awarded points",
    ).toBe(0);
    expect(await countKudos(other.groupId)).toBe(0);
    expect(await rewardedPointsOf(other.groupId)).toBe(0);
  });
});

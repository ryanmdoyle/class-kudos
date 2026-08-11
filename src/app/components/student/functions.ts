"use server";

import { assertStudentEnrolled, requireStudent } from "@/auth";
import { db } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";
import {
  applyLocationChange,
  type LocationChangeResult,
} from "@/app/components/public/locationService";

/**
 * THE STUDENT ACTION BOUNDARY.
 *
 * Every export here is an RSC action addressable by id by anyone on the
 * internet. In rwsdk 1.x, actions traverse the middleware pipeline and every
 * redirecting middleware in `src/worker.tsx` begins with `if (isAction) return;`
 * — so the `/student` prefix guard DOES NOT PROTECT THESE. Without the calls
 * below, a teacher, another class's student, or a logged-out attacker with a
 * crafted action id could invoke them directly.
 *
 * Therefore, without exception, every function here begins with:
 *   requireStudent()                    — 403 for anyone who is not a student
 *   await assertStudentEnrolled(groupId) — 404 for a group that is not theirs
 *
 * Keep this file small and never `export *` from it.
 */

export type RequestRewardResult =
  | { ok: true; points: number }
  | { ok: false; error: string };

/**
 * Thrown INSIDE the redemption transaction when the guarded deduction matches
 * no row, i.e. the child cannot afford the reward.
 *
 * !! READ THIS BEFORE EDITING THE TRANSACTION BELOW !!
 * Kysely rolls back ONLY on a thrown error. Returning a value from the callback
 * — including a perfectly innocent-looking `{ ok: false, error }` — COMMITS.
 * A "refuse and abort" path therefore has to throw, and the refusal is turned
 * back into a `RequestRewardResult` outside the callback. Nothing else in this
 * file throws for control flow; this is the exception, and it exists so that a
 * refusal cannot silently commit a deduction.
 */
class InsufficientPointsError extends Error {
  constructor() {
    super("insufficient points");
    this.name = "InsufficientPointsError";
  }
}

/**
 * Redeem a reward.
 *
 * "Spend the points" and "record the request" are ONE unit of work, so they run
 * in one transaction: either the child is charged and the teacher sees the
 * request, or neither happened. There is no compensating write and no window in
 * which a redemption can be lost while the points stay spent.
 *
 * The `points >= cost` predicate STAYS IN THE WHERE CLAUSE. It is not made
 * redundant by the transaction — under READ COMMITTED it is the compare-and-swap
 * that makes two taps on the same button race in the database rather than in
 * JavaScript, so a child can never double-spend or go negative, and it costs
 * nothing compared with a `SELECT ... FOR UPDATE`. (The legacy code read the
 * balance, compared it in the component, then decremented — that check could
 * always be lost to a race or simply skipped by calling the action directly.)
 * Do not "simplify" it into a read-then-write.
 */
export async function requestReward(input: {
  groupId: string;
  rewardId: string;
  response?: string;
}): Promise<RequestRewardResult> {
  const user = requireStudent();
  await assertStudentEnrolled(input.groupId);

  const { groupId, rewardId } = input;

  // Scoped to the group so a reward id from another class cannot be spent here.
  const reward = await db
    .selectFrom("rewards")
    .select(["id", "name", "cost", "responseRequired", "responsePrompt"])
    .where("id", "=", rewardId)
    .where("groupId", "=", groupId)
    .executeTakeFirst();

  if (!reward) {
    return { ok: false, error: "That reward isn't available any more." };
  }

  // Defensive: a negative cost would turn redemption into a points machine.
  if (reward.cost < 0) {
    return { ok: false, error: "That reward isn't available any more." };
  }

  const response = (input.response ?? "").trim().slice(0, 1000);

  if (reward.responseRequired && response.length === 0) {
    return {
      ok: false,
      error:
        reward.responsePrompt?.trim() ||
        "Please answer the question before you send this request.",
    };
  }

  try {
    // Every statement below uses `trx`, never the ambient `db`. `db` is a
    // request-scoped proxy over a pool of ONE connection, so a stray `db` query
    // in here would not merely run outside the transaction — it would queue
    // behind the connection this callback is holding and hang the request.
    const points = await db.transaction().execute(async (trx) => {
      // Guarded deduction. See the note above: `points >= cost` is deliberate.
      const updated = await trx
        .updateTable("enrollments")
        .set((eb) => ({ points: eb("points", "-", reward.cost) }))
        .where("userId", "=", user.id)
        .where("groupId", "=", groupId)
        .where("points", ">=", reward.cost)
        .returning("points")
        .executeTakeFirst();

      if (!updated) {
        // Cannot afford it — or a second tap already spent the balance. THROW,
        // do not return: a returned `{ ok: false }` would commit a deduction
        // that this branch exists to prevent. Caught immediately below.
        throw new InsufficientPointsError();
      }

      // Record the request. `name`/`cost` are snapshotted so editing the reward
      // later does not rewrite the child's history.
      await trx
        .insertInto("redeemed")
        .values({
          id: newId(),
          userId: user.id,
          groupId,
          name: reward.name,
          cost: reward.cost,
          response: response.length > 0 ? response : null,
          reviewed: false,
          reviewedAt: null,
          createdAt: nowIso(),
        })
        .execute();

      return updated.points;
    });

    return { ok: true, points };
  } catch (error) {
    if (error instanceof InsufficientPointsError) {
      return {
        ok: false,
        error: `You need ${reward.cost} kudos for that. Keep going!`,
      };
    }

    // Anything else rolled the whole thing back, so the balance is untouched.
    console.error("requestReward: transaction rolled back", error);

    return {
      ok: false,
      error: "That didn't save. Your kudos are safe — please try again.",
    };
  }
}

/**
 * The student signs THEMSELVES in or out of the room.
 *
 * The enrollment is looked up from the session user plus the group; the browser
 * never sends an enrollment id, so there is no id to tamper with. This is the
 * authenticated twin of the anonymous classroom board in
 * `@/app/components/public/functions`, and both funnel into the same
 * `applyLocationChange`.
 */
export async function setMyLocation(input: {
  groupId: string;
  locationId: string | null;
}): Promise<LocationChangeResult> {
  const user = requireStudent();
  await assertStudentEnrolled(input.groupId);

  const enrollment = await db
    .selectFrom("enrollments")
    .select(["id"])
    .where("userId", "=", user.id)
    .where("groupId", "=", input.groupId)
    .executeTakeFirst();

  if (!enrollment) {
    return { ok: false, error: "We couldn't find your class. Please refresh." };
  }

  return applyLocationChange({
    groupId: input.groupId,
    enrollmentId: enrollment.id,
    locationId: input.locationId ?? null,
  });
}

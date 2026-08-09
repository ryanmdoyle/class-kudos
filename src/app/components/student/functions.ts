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
 * Redeem a reward.
 *
 * !! NO TRANSACTIONS !! `db.transaction()` throws at runtime in rwsdk/db 1.7.0,
 * so "spend points AND record the request" cannot be one atomic unit. The
 * ordering here is chosen so that the failure modes are safe rather than
 * convenient:
 *
 *   1. Deduct FIRST, as a single conditional UPDATE carrying `points >= cost`
 *      in its own WHERE clause. That is a compare-and-swap: two taps on the
 *      same button race in the database, not in JavaScript, so a child can
 *      never double-spend or go negative. (The legacy code read the balance,
 *      compared it in the component, then decremented — that check could always
 *      be lost to a race or simply skipped by calling the action directly.)
 *   2. Insert the `redeemed` row.
 *   3. If (2) throws, re-credit the points. The reward request is lost but the
 *      balance is right, which is the failure a teacher can actually recover
 *      from — the child asks again.
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

  // Step 1 — atomic, guarded deduction. `points >= cost` lives in the WHERE.
  const updated = await db
    .updateTable("enrollments")
    .set((eb) => ({ points: eb("points", "-", reward.cost) }))
    .where("userId", "=", user.id)
    .where("groupId", "=", groupId)
    .where("points", ">=", reward.cost)
    .returning(["id", "points"])
    .executeTakeFirst();

  if (!updated) {
    return {
      ok: false,
      error: `You need ${reward.cost} kudos for that. Keep going!`,
    };
  }

  // Step 2 — record the request. `name`/`cost` are snapshotted so editing the
  // reward later does not rewrite the child's history.
  try {
    await db
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
  } catch (error) {
    // Step 3 — compensate. Nothing else can undo step 1 for us.
    await db
      .updateTable("enrollments")
      .set((eb) => ({ points: eb("points", "+", reward.cost) }))
      .where("id", "=", updated.id)
      .execute();

    console.error("requestReward: redemption insert failed, points restored", error);

    return {
      ok: false,
      error: "That didn't save. Your kudos are safe — please try again.",
    };
  }

  return { ok: true, points: updated.points };
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

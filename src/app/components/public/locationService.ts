import "server-only";

import { db } from "@/db";
import { newId } from "@/lib/dbValues";

/**
 * The ONE implementation of "this student moved".
 *
 * Two callers reach it, and they authorize completely differently:
 *   - `@/app/components/public/functions` — the unauthenticated classroom board.
 *     Authorization is "the caller knows this group's `publicId`", and the group
 *     id is resolved FROM that publicId server-side.
 *   - `@/app/components/student/functions` — a signed-in student moving
 *     themselves. Authorization is `assertStudentEnrolled(groupId)`.
 *
 * Neither passes a group id straight through from the browser, and this module
 * re-checks that the enrollment and the location both belong to the `groupId`
 * it was handed. That containment check is what stops a board for class A from
 * being used to move a child in class B.
 *
 * NOT a `"use server"` module — nothing here may become a network endpoint on
 * its own. The two wrappers above are the only published surface.
 *
 * A move is three writes and they are one Postgres transaction: either the
 * child's current location and both audit rows all land, or none of them do.
 */

export type LocationChangeResult =
  | {
      ok: true;
      locationId: string | null;
      locationName: string | null;
      locationColor: string | null;
    }
  | { ok: false; error: string };

/** Deliberately identical for "no such enrollment" and "not in this group". */
const NOT_FOUND = "We couldn't find that student. Please refresh the page.";
const STALE = "Someone just moved that student. Please refresh and try again.";

/**
 * Thrown INSIDE the move transaction when the compare-and-swap on the
 * enrollment matches no row — i.e. somebody else moved this child between our
 * read and our write.
 *
 * !! READ THIS BEFORE EDITING THE TRANSACTION BELOW !!
 * Kysely rolls back ONLY on a thrown error. Returning a value from the callback
 * — including an innocent-looking `{ ok: false, error: STALE }` — COMMITS. The
 * two `locationHistory` writes that run before the swap would then be committed
 * on behalf of a request that lost the race, corrupting the audit trail with a
 * departure and an arrival that never happened. So the refusal throws, and is
 * turned back into a `LocationChangeResult` outside the callback.
 */
class StaleMoveError extends Error {
  constructor() {
    super("lost the compare-and-swap on enrollments.currentLocationId");
    this.name = "StaleMoveError";
  }
}

type EnrollmentRowLite = {
  id: string;
  userId: string;
  groupId: string;
  currentLocationId: string | null;
};

export type LocationChangeInput = {
  /** Always resolved server-side — never taken verbatim from the browser. */
  groupId: string;
  enrollmentId: string;
  /** `null` means "back in class". */
  locationId: string | null;
};

export async function applyLocationChange({
  groupId,
  enrollmentId,
  locationId,
}: LocationChangeInput): Promise<LocationChangeResult> {
  /*
   * Validation runs OUTSIDE the transaction on purpose. These are pure reads
   * with nothing to roll back, and keeping them out here means every "refuse"
   * path below is an ordinary `return` rather than a throw — see StaleMoveError
   * for why a `return` inside the callback would be a bug.
   *
   * Reading `currentLocationId` out here and writing inside is safe *because*
   * of the compare-and-swap at the end of the transaction: if this read went
   * stale in the meantime, the swap matches no row and the whole move unwinds.
   */
  const enrollment: EnrollmentRowLite | undefined = await db
    .selectFrom("enrollments")
    .select(["id", "userId", "groupId", "currentLocationId"])
    .where("id", "=", enrollmentId)
    // Containment check #1: the enrollment must be in the caller's group.
    .where("groupId", "=", groupId)
    .executeTakeFirst();

  if (!enrollment) {
    return { ok: false, error: NOT_FOUND };
  }

  let location: { id: string; name: string; color: string | null } | null = null;

  if (locationId !== null) {
    const row = await db
      .selectFrom("locations")
      .select(["id", "name", "color"])
      .where("id", "=", locationId)
      // Containment check #2: you may only travel to your own group's places.
      .where("groupId", "=", groupId)
      .where("isActive", "=", true)
      .executeTakeFirst();

    if (!row) {
      return { ok: false, error: NOT_FOUND };
    }

    location = row;
  }

  const previousLocationId = enrollment.currentLocationId;

  /*
   * Idempotent short-circuit: a double-tap on the tile they are already in must
   * not open a second history row. This is NOT made redundant by the
   * transaction — a transaction would happily commit the duplicate arrival.
   * It stays.
   */
  if (previousLocationId === locationId) {
    return {
      ok: true,
      locationId,
      locationName: location?.name ?? null,
      locationColor: location?.color ?? null,
    };
  }

  const now = new Date();

  try {
    /*
     * Every statement below uses `trx`, never the ambient `db`. `db` is a
     * request-scoped proxy over a pool of ONE connection, so a stray `db` query
     * in here would not merely run outside the transaction — it would queue
     * behind the connection this callback is holding and hang the request.
     *
     * The writes are in the order the events actually happen: leave the old
     * place, arrive at the new one, then point the enrollment at where the
     * child now is. Ordering is a free choice now that the three writes commit
     * or fail together; it is chosen to read chronologically.
     */
    await db.transaction().execute(async (trx) => {
      // 1 — close the open history row for the place they just left.
      if (previousLocationId !== null) {
        const open = await trx
          .selectFrom("locationHistory")
          .select(["id", "arrivedAt"])
          .where("userId", "=", enrollment.userId)
          .where("groupId", "=", groupId)
          .where("locationId", "=", previousLocationId)
          .where("leftAt", "is", null)
          .orderBy("arrivedAt", "desc")
          .executeTakeFirst();

        if (open) {
          // `arrivedAt` is a real `Date` off a timestamptz column, so there is
          // no parse here and no NaN to guard against. `max(0, …)` still
          // stands: a clock skew between app servers could otherwise write a
          // negative duration.
          const minutes = Math.max(
            0,
            Math.floor((now.getTime() - open.arrivedAt.getTime()) / 60_000),
          );

          await trx
            .updateTable("locationHistory")
            .set({ leftAt: now, duration: minutes })
            .where("id", "=", open.id)
            .execute();
        }
      }

      // 2 — open a history row for the place they are going to.
      if (locationId !== null) {
        await trx
          .insertInto("locationHistory")
          .values({
            id: newId(),
            userId: enrollment.userId,
            locationId,
            groupId,
            arrivedAt: now,
            leftAt: null,
            duration: null,
          })
          .execute();
      }

      /*
       * 3 — compare-and-swap the enrollment, and the gate for the whole move.
       *
       * !! THE `currentLocationId = <what we read>` PREDICATE STAYS. !!
       * It is not made redundant by the transaction. Under READ COMMITTED two
       * simultaneous taps both reach this UPDATE; the second one blocks on the
       * row lock, and when the first commits it re-evaluates this predicate
       * against the NEW row, finds the location has moved on, and matches
       * nothing. That is what resolves a double-tap to exactly one winner
       * without a `SELECT … FOR UPDATE`, and it is the cheapest way to get it.
       * Delete it and both taps "succeed", each writing its own arrival row.
       */
      const updated = await trx
        .updateTable("enrollments")
        .set({ currentLocationId: locationId, locationUpdatedAt: now })
        .where("id", "=", enrollment.id)
        .where("groupId", "=", groupId)
        .where((eb) =>
          previousLocationId === null
            ? eb("currentLocationId", "is", null)
            : eb("currentLocationId", "=", previousLocationId),
        )
        .returning(["id"])
        .executeTakeFirst();

      if (!updated) {
        // We lost the race. THROW, do not return: a returned value commits,
        // and the two history writes above are still pending. Caught below.
        throw new StaleMoveError();
      }
    });
  } catch (caught) {
    if (caught instanceof StaleMoveError) {
      return { ok: false, error: STALE };
    }

    // Anything else rolled the whole move back, so the child is still shown in
    // the place they were, and the history has no half-written move in it.
    console.error("applyLocationChange: transaction rolled back", caught);
    throw caught;
  }

  return {
    ok: true,
    locationId,
    locationName: location?.name ?? null,
    locationColor: location?.color ?? null,
  };
}

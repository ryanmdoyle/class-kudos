import "server-only";

import { db } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";

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
 * !! NO TRANSACTIONS !! `db.transaction()` type-checks but throws
 * "Transactions are not supported yet." in rwsdk/db 1.7.0. A move is therefore
 * three statements, ordered and guarded as described in `applyLocationChange`.
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

  // Idempotent: a double-tap must not open a second history row.
  if (previousLocationId === locationId) {
    return {
      ok: true,
      locationId,
      locationName: location?.name ?? null,
      locationColor: location?.color ?? null,
    };
  }

  const now = nowIso();

  /*
   * Statement 1 — compare-and-swap on the enrollment.
   *
   * The `currentLocationId = <what we read>` predicate makes this a CAS: if two
   * children tap the same tile at once, exactly one UPDATE matches a row and the
   * other gets `undefined` back and bails out BEFORE writing any history. That
   * is what replaces the transaction we cannot have — the history writes below
   * only ever run for the request that actually won the swap.
   *
   * The enrollment is written FIRST on purpose. It is the value the board and
   * the teacher read; `locationHistory` is an audit trail. If a later statement
   * fails, the room is still showing the truth and only the log is incomplete —
   * the far better of the two failure modes.
   */
  const updated = await db
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
    return { ok: false, error: STALE };
  }

  // Statement 2 — close the open history row for the place they just left.
  if (previousLocationId !== null) {
    const open = await db
      .selectFrom("locationHistory")
      .select(["id", "arrivedAt"])
      .where("userId", "=", enrollment.userId)
      .where("groupId", "=", groupId)
      .where("locationId", "=", previousLocationId)
      .where("leftAt", "is", null)
      .orderBy("arrivedAt", "desc")
      .executeTakeFirst();

    if (open) {
      const arrived = new Date(open.arrivedAt).getTime();
      const minutes = Number.isNaN(arrived)
        ? null
        : Math.max(0, Math.floor((Date.parse(now) - arrived) / 60_000));

      await db
        .updateTable("locationHistory")
        .set({ leftAt: now, duration: minutes })
        .where("id", "=", open.id)
        .execute();
    }
  }

  // Statement 3 — open a history row for the place they are going to.
  if (locationId !== null) {
    await db
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

  return {
    ok: true,
    locationId,
    locationName: location?.name ?? null,
    locationColor: location?.color ?? null,
  };
}

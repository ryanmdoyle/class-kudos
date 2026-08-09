"use server";

import { findPublicGroupByPublicId } from "./board";
import { applyLocationChange, type LocationChangeResult } from "./locationService";

/**
 * THE PUBLIC BOARD'S ONLY NETWORK ENDPOINT.
 *
 * Every export of a `"use server"` module is an RSC action addressable by id by
 * anyone on the internet, so this file exports exactly ONE function and holds no
 * other logic. The loaders live in `./board` and the write logic in
 * `./locationService`, neither of which is `"use server"`.
 *
 * There is no session here BY DESIGN: the classroom board is a projector or a
 * shared iPad by the door that nobody logs in to. The capability is the group's
 * `publicId`, so:
 *
 *   - the caller sends `groupPublicId`, NOT a group id;
 *   - the server resolves the group from it (`findPublicGroupByPublicId`,
 *     which also refuses archived groups);
 *   - `applyLocationChange` then verifies that both the enrollment and the
 *     destination belong to THAT group.
 *
 * So the worst a crafted request can do is move a child within a class whose
 * board URL the caller already has — which is exactly the authority the board
 * itself grants. The legacy version took a bare `enrollmentId` with no group
 * check at all, which let anyone move any student in any class in the system.
 *
 * The board never learns a `groupId`, a `userId`, or a point balance; see
 * `./types`.
 */
export async function updateTravelLocation(
  groupPublicId: string,
  enrollmentId: string,
  locationId: string | null,
): Promise<LocationChangeResult> {
  const group = await findPublicGroupByPublicId(groupPublicId);

  if (!group) {
    return { ok: false, error: "This travel log is no longer available." };
  }

  if (!enrollmentId) {
    return { ok: false, error: "We couldn't find that student." };
  }

  return applyLocationChange({
    groupId: group.id,
    enrollmentId,
    locationId: locationId ?? null,
  });
}

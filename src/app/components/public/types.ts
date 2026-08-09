/**
 * View models for the PUBLIC classroom travel board.
 *
 * This module is imported by `"use client"` components, so it must stay
 * TYPE-ONLY and dependency-free. Never import `@/db` here.
 *
 * These shapes are also the leak boundary for `/travel-log/:groupPublicId`,
 * which anybody holding the 6-character `groups.publicId` can open with no
 * session at all. Everything a board needs is here and NOTHING else:
 *   - no `userId` (so the board is not a directory of user ids)
 *   - no `points` (a student's balance is not public)
 *   - no email / username / role / group id
 * `lastInitial` rather than `lastName` is the minimum that still disambiguates
 * two children called "Jack" on a projector at the front of the room.
 */

export type BoardLocation = {
  id: string;
  name: string;
  color: string | null;
};

export type BoardStudent = {
  /** Addresses one row of `enrollments`; the only id the board may act on. */
  enrollmentId: string;
  firstName: string;
  /** "" when the surname is empty. */
  lastInitial: string;
  locationId: string | null;
  locationName: string | null;
  locationColor: string | null;
};

export type TravelBoard = {
  groupName: string;
  groupPublicId: string;
  students: BoardStudent[];
  locations: BoardLocation[];
};

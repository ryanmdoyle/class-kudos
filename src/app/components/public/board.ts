import "server-only";

import { db } from "@/db";

import type { BoardLocation, BoardStudent, TravelBoard } from "./types";

/**
 * Loader for the public travel board.
 *
 * NOT a `"use server"` module — it is called from the page's server render, not
 * over the network.
 *
 * The group is ALWAYS resolved by `groups.publicId`, never by `groups.id`:
 * `publicId` is the only identifier a teacher hands out (it is what is in the
 * URL they project), and it is the capability that gates this whole page.
 * Accepting `id` here would turn the board into an enumeration oracle over
 * every class in the system.
 *
 * The `SELECT` list is the leak boundary — see `./types`. Do not add columns
 * without re-reading that comment.
 */

export async function findPublicGroupByPublicId(publicId: string) {
  if (!publicId) return null;

  const group = await db
    .selectFrom("groups")
    .select(["id", "name", "publicId", "archived"])
    .where("publicId", "=", publicId)
    .executeTakeFirst();

  // An archived class is a retired class. Its board stops responding rather
  // than silently accepting travel updates nobody is watching.
  if (!group || group.archived) return null;

  return { id: group.id, name: group.name, publicId: group.publicId };
}

export async function loadGroupLocations(
  groupId: string,
): Promise<BoardLocation[]> {
  return db
    .selectFrom("locations")
    .select(["id", "name", "color"])
    .where("groupId", "=", groupId)
    .where("isActive", "=", true)
    .orderBy("name", "asc")
    .execute();
}

export async function loadBoardStudents(
  groupId: string,
): Promise<BoardStudent[]> {
  const rows = await db
    .selectFrom("enrollments")
    .innerJoin("users", "users.id", "enrollments.userId")
    // LEFT join: a student who is in class has no current location.
    .leftJoin("locations", "locations.id", "enrollments.currentLocationId")
    .select([
      "enrollments.id as enrollmentId",
      "users.firstName as firstName",
      "users.lastName as lastName",
      "enrollments.currentLocationId as locationId",
      "locations.name as locationName",
      "locations.color as locationColor",
    ])
    .where("enrollments.groupId", "=", groupId)
    .where("users.role", "=", "STUDENT")
    .orderBy("users.firstName", "asc")
    .orderBy("users.lastName", "asc")
    .execute();

  return rows.map((row) => ({
    enrollmentId: row.enrollmentId,
    firstName: row.firstName,
    lastInitial: row.lastName ? row.lastName.slice(0, 1).toUpperCase() : "",
    locationId: row.locationId,
    locationName: row.locationName,
    locationColor: row.locationColor,
  }));
}

/** Everything `/travel-log/:groupPublicId` renders, or `null` if no such board. */
export async function loadTravelBoard(
  publicId: string,
): Promise<TravelBoard | null> {
  const group = await findPublicGroupByPublicId(publicId);
  if (!group) return null;

  const [students, locations] = await Promise.all([
    loadBoardStudents(group.id),
    loadGroupLocations(group.id),
  ]);

  return {
    groupName: group.name,
    groupPublicId: group.publicId,
    students,
    locations,
  };
}

import "server-only";

import { db } from "@/db";

import type {
  StudentEnrollment,
  StudentGroupCard,
  StudentKudos,
  StudentRedemption,
  StudentReward,
} from "@/app/components/student/types";

/**
 * Every read behind the student pages.
 *
 * NOT a `"use server"` module — these are called from server renders, never
 * over the network, so none of them becomes an RSC action.
 *
 * THE INVARIANT THIS FILE EXISTS TO ENFORCE: every function takes `userId` as
 * its FIRST argument and puts it in the WHERE clause. A student page must never
 * be able to read another child's points, kudos or redemptions by passing a
 * different id, so there is no "fetch by enrollment id" helper here at all —
 * the enrollment is always found from (userId, groupId). Callers pass
 * `ctx.user.id`, which comes from the signed session and not from the URL.
 *
 * `assertStudentEnrolled(groupId)` in the page/action is still required: it is
 * what turns "not your class" into a 404 instead of an empty page.
 */

/** The signed-in student's non-archived classes, for `/student`. */
export async function loadStudentGroups(
  userId: string,
): Promise<StudentGroupCard[]> {
  const rows = await db
    .selectFrom("enrollments")
    .innerJoin("groups", "groups.id", "enrollments.groupId")
    .select([
      "groups.id as groupId",
      "groups.name as groupName",
      "enrollments.points as points",
    ])
    .where("enrollments.userId", "=", userId)
    .where("groups.archived", "=", false)
    .orderBy("groups.name", "asc")
    .execute();

  return rows;
}

/**
 * The student's membership of one group, with where they currently are.
 *
 * Returns `null` when they are not enrolled — the caller should already have
 * run `assertStudentEnrolled`, so `null` here means the group was archived or
 * removed between the two reads.
 */
export async function loadStudentEnrollment(
  userId: string,
  groupId: string,
): Promise<StudentEnrollment | null> {
  const row = await db
    .selectFrom("enrollments")
    .innerJoin("groups", "groups.id", "enrollments.groupId")
    .leftJoin("locations", "locations.id", "enrollments.currentLocationId")
    .select([
      "enrollments.id as enrollmentId",
      "groups.id as groupId",
      "groups.name as groupName",
      "enrollments.points as points",
      "enrollments.currentLocationId as locationId",
      "locations.name as locationName",
      "locations.color as locationColor",
    ])
    .where("enrollments.userId", "=", userId)
    .where("enrollments.groupId", "=", groupId)
    .where("groups.archived", "=", false)
    .executeTakeFirst();

  return row ?? null;
}

/** Newest first. Capped: this is a history list on a school tablet, not a feed. */
export async function loadStudentKudos(
  userId: string,
  groupId: string,
  limit = 100,
): Promise<StudentKudos[]> {
  return db
    .selectFrom("kudos")
    .select(["id", "name", "value", "createdAt"])
    .where("userId", "=", userId)
    .where("groupId", "=", groupId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .execute();
}

/** The group's reward catalogue. Cheapest first — that is what a child can afford. */
export async function loadGroupRewards(
  groupId: string,
): Promise<StudentReward[]> {
  const rows = await db
    .selectFrom("rewards")
    .select(["id", "name", "cost", "responseRequired", "responsePrompt"])
    .where("groupId", "=", groupId)
    .orderBy("cost", "asc")
    .orderBy("name", "asc")
    .execute();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cost: row.cost,
    // integer 0/1 -> boolean, converted once, here at the query boundary.
    responseRequired: row.responseRequired,
    responsePrompt: row.responsePrompt,
  }));
}

export async function loadStudentRedemptions(
  userId: string,
  groupId: string,
  limit = 100,
): Promise<StudentRedemption[]> {
  const rows = await db
    .selectFrom("redeemed")
    .select(["id", "name", "cost", "reviewed", "response", "createdAt"])
    .where("userId", "=", userId)
    .where("groupId", "=", groupId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .execute();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cost: row.cost,
    reviewed: row.reviewed,
    response: row.response,
    createdAt: row.createdAt,
  }));
}

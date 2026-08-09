import "server-only";

import { db } from "@/db";
import type { EnrollmentWithUser, KudosWithUser } from "@/app/lib/types";
import type {
  RedemptionRow,
  TravelLogRow,
} from "@/app/components/teacher/types";

export type { RedemptionRow, TravelLogRow };

/**
 * Read-side queries for the teacher pages.
 *
 * NOT a "use server" module — deliberately. These are called from server
 * components (and from `functions.ts`) by direct import, so they never become
 * RSC endpoints. Anything a browser must be able to call goes in `functions.ts`
 * and starts with a guard.
 *
 * Every function here takes an already-authorised `groupId`: the CALLER is
 * responsible for `await assertTeacherOwnsGroup(groupId)` first. Nothing in this
 * file re-checks ownership, so do not call it before asserting.
 *
 * rwsdk/db is Kysely, so Prisma's `include:` is replaced by explicit joins with
 * `as` aliases — without the aliases `users.id` and `enrollments.id` collide and
 * one silently wins.
 */

/** Replaces `db.enrollment.findMany({ include: { user: true } })`. */
export async function loadEnrollmentsWithUser(
  groupId: string,
): Promise<EnrollmentWithUser[]> {
  const rows = await db
    .selectFrom("enrollments")
    .innerJoin("users", "users.id", "enrollments.userId")
    .select([
      "enrollments.id as id",
      "enrollments.userId as userId",
      "enrollments.groupId as groupId",
      "enrollments.points as points",
      "enrollments.currentLocationId as currentLocationId",
      "enrollments.locationUpdatedAt as locationUpdatedAt",
      "enrollments.createdAt as createdAt",
      "users.id as studentId",
      "users.firstName as firstName",
      "users.lastName as lastName",
    ])
    .where("enrollments.groupId", "=", groupId)
    .orderBy("users.firstName", "asc")
    .orderBy("users.lastName", "asc")
    .execute();

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    groupId: row.groupId,
    points: row.points,
    currentLocationId: row.currentLocationId,
    locationUpdatedAt: row.locationUpdatedAt,
    createdAt: row.createdAt,
    user: {
      id: row.studentId,
      firstName: row.firstName,
      lastName: row.lastName,
    },
  }));
}

/** Replaces `db.kudos.findMany({ include: { user: { select: … } } })`. */
export async function loadKudosWithUser(
  groupId: string,
): Promise<KudosWithUser[]> {
  const rows = await db
    .selectFrom("kudos")
    .innerJoin("users", "users.id", "kudos.userId")
    .select([
      "kudos.id as id",
      "kudos.createdAt as createdAt",
      "kudos.name as name",
      "kudos.value as value",
      "kudos.userId as userId",
      "kudos.groupId as groupId",
      "users.firstName as firstName",
      "users.lastName as lastName",
    ])
    .where("kudos.groupId", "=", groupId)
    .orderBy("kudos.createdAt", "desc")
    .execute();

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    name: row.name,
    value: row.value,
    userId: row.userId,
    groupId: row.groupId,
    user: {
      id: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
    },
  }));
}

/** The badge on the Rewards nav item. */
export async function countPendingRedemptions(
  groupId: string,
): Promise<number> {
  const row = await db
    .selectFrom("redeemed")
    .select((eb) => eb.fn.count<number>("id").as("pending"))
    .where("groupId", "=", groupId)
    .where("reviewed", "=", false)
    .executeTakeFirst();

  return Number(row?.pending ?? 0);
}

/** Replaces `db.redeemed.findMany({ include: { user: { select: … } } })`. */
export async function loadRedemptions(
  groupId: string,
): Promise<RedemptionRow[]> {
  return db
    .selectFrom("redeemed")
    .innerJoin("users", "users.id", "redeemed.userId")
    .select([
      "redeemed.id as id",
      "redeemed.name as name",
      "redeemed.cost as cost",
      "redeemed.response as response",
      "redeemed.reviewed as reviewed",
      "redeemed.reviewedAt as reviewedAt",
      "redeemed.createdAt as createdAt",
      "users.firstName as firstName",
      "users.lastName as lastName",
    ])
    .where("redeemed.groupId", "=", groupId)
    .orderBy("redeemed.createdAt", "desc")
    .execute();
}

/** Replaces `db.locationHistory.findMany({ include: { user, location } })`. */
export async function loadTravelLog(
  groupId: string,
  limit = 500,
): Promise<TravelLogRow[]> {
  return db
    .selectFrom("locationHistory")
    .innerJoin("users", "users.id", "locationHistory.userId")
    .innerJoin("locations", "locations.id", "locationHistory.locationId")
    .select([
      "locationHistory.id as id",
      "locationHistory.arrivedAt as arrivedAt",
      "locationHistory.leftAt as leftAt",
      "locationHistory.duration as duration",
      "users.firstName as firstName",
      "users.lastName as lastName",
      "locations.name as locationName",
      "locations.color as locationColor",
    ])
    .where("locationHistory.groupId", "=", groupId)
    .orderBy("locationHistory.arrivedAt", "desc")
    .limit(limit)
    .execute();
}

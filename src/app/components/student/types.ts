/**
 * View models for the STUDENT surface.
 *
 * Type-only and dependency-free so `"use client"` components can import from
 * here without dragging `@/db` into the browser bundle.
 *
 * Everything below describes the SIGNED-IN student and nobody else. There is
 * deliberately no `userId` on any of these: the student pages never address a
 * user by id, they read `ctx.user.id` from the session, so there is no id for a
 * crafted request to swap out.
 *
 * Nothing is converted at this boundary: Postgres hands back a real `boolean`
 * for `reviewed` and a real `Date` for every `timestamptz`, so these types are
 * the row shapes as they arrive. Dates are turned into text by `./format`,
 * once, on the server.
 */

/** One row of "my classes" on `/student`. */
export type StudentGroupCard = {
  groupId: string;
  groupName: string;
  points: number;
};

/** The signed-in student's membership of one group. */
export type StudentEnrollment = {
  enrollmentId: string;
  groupId: string;
  groupName: string;
  points: number;
  locationId: string | null;
  locationName: string | null;
  locationColor: string | null;
};

export type StudentKudos = {
  id: string;
  name: string;
  value: number;
  /** A real `Date`, straight off a `timestamptz` column. */
  createdAt: Date;
};

export type StudentReward = {
  id: string;
  name: string;
  cost: number;
  responseRequired: boolean;
  responsePrompt: string | null;
};

export type StudentRedemption = {
  id: string;
  name: string;
  cost: number;
  reviewed: boolean;
  response: string | null;
  /** A real `Date`, straight off a `timestamptz` column. */
  createdAt: Date;
};

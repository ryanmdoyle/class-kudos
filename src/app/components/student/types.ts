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
 * SQLite representations are already converted here: `reviewed` is a real
 * boolean, timestamps are still ISO-8601 strings (formatted by
 * `./format`, once, on the server).
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
  /** ISO-8601. */
  createdAt: string;
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
  /** ISO-8601. */
  createdAt: string;
};

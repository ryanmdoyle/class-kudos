/**
 * Teacher-area view types.
 *
 * These are the shapes the teacher queries project into. They live in their own
 * module — separate from `queries.ts`, which is `server-only` — so that client
 * components can name them without a `server-only` module ever appearing in
 * their import graph, even transitively and even by accident.
 *
 * `@/app/lib/types` holds the shared, cross-area row-derived view models
 * (EnrollmentWithUser, KudosWithUser, StudentSummary).
 */

/** A student's name, pre-flattened for the random-student / random-groups tools. */
export type Name = {
  firstName: string;
  lastName: string;
  fullName: string;
};

/**
 * A reward redemption joined to the student who requested it.
 *
 * Postgres returns a real `boolean` and real `Date`s — there is no conversion at
 * the boundary any more. Dates are still formatted on the CLIENT so they render
 * in the teacher's own timezone rather than the server's.
 */
export type RedemptionRow = {
  id: string;
  name: string;
  cost: number;
  response: string | null;
  reviewed: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
  firstName: string;
  lastName: string;
};

/**
 * Client-side mirrors of `@/auth/classCodes`'s `StudentCodeRow` / `GroupCodesView`.
 *
 * Declared here rather than imported because `@/auth/classCodes` is a
 * `server-only` module and these types are needed by "use client" components.
 * They are structurally identical, so the server action's return value assigns
 * to them directly and any drift in the auth module's shape is a compile error
 * at the assignment.
 */
export type StudentCodeView = {
  enrollmentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  code: string | null;
};

export type GroupCodesViewModel = {
  mode: "shared" | "individual";
  groupCode: string | null;
  students: StudentCodeView[];
};

/** One travel-log entry joined to its student and location. */
export type TravelLogRow = {
  id: string;
  arrivedAt: Date;
  leftAt: Date | null;
  duration: number | null;
  firstName: string;
  lastName: string;
  locationName: string;
  locationColor: string | null;
};

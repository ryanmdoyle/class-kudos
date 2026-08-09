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
 * `reviewed` is the raw SQLite integer (0/1) — convert with `toBool` from
 * `@/lib/sqlite` at the point of use. `createdAt` / `reviewedAt` are ISO-8601
 * text and are formatted on the CLIENT so they render in the teacher's timezone.
 */
export type RedemptionRow = {
  id: string;
  name: string;
  cost: number;
  response: string | null;
  reviewed: number;
  reviewedAt: string | null;
  createdAt: string;
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
  arrivedAt: string;
  leftAt: string | null;
  duration: number | null;
  firstName: string;
  lastName: string;
  locationName: string;
  locationColor: string | null;
};

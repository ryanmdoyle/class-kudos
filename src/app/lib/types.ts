import type { EnrollmentRow, KudosRow, UserRow } from "@/db";

/**
 * View-model types shared across pages.
 *
 * These are NOT Prisma relation types any more. Kysely has no `include:` and no
 * lazy relation loading. You build these shapes yourself with an explicit
 * `.innerJoin()` / `.leftJoin()` and aliased `.select([...])`, and the compiler
 * checks that what you selected matches.
 */

/** The public projection of a student. Never leak email to a page. */
export type StudentSummary = Pick<
  UserRow,
  "id" | "firstName" | "lastName"
>;

export type EnrollmentWithUser = EnrollmentRow & { user: StudentSummary };

export type KudosWithUser = KudosRow & { user: StudentSummary };

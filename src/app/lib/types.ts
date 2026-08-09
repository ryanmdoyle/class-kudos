import type { EnrollmentRow, KudosRow, UserRow } from "@/db";

/**
 * View-model types shared across pages.
 *
 * These are NOT Prisma relation types any more. rwsdk/db is Kysely: there is no
 * `include:` and no lazy relation loading. You build these shapes yourself with
 * an explicit `.innerJoin()` / `.leftJoin()` and aliased `.select([...])`, and
 * the compiler checks that what you selected matches.
 *
 * Remember the SQLite representation:
 *   - booleans are `number` (0 / 1)
 *   - timestamps are `string` (ISO-8601)
 * Convert with the helpers in `@/lib/sqlite` at the query boundary, once.
 */

/** The public projection of a student. Never leak email/supabaseUserId to a page. */
export type StudentSummary = Pick<
  UserRow,
  "id" | "firstName" | "lastName"
>;

export type EnrollmentWithUser = EnrollmentRow & { user: StudentSummary };

export type KudosWithUser = KudosRow & { user: StudentSummary };

import { env } from "cloudflare:workers";
import { createDb, type Database as DatabaseType } from "rwsdk/db";

import { type migrations } from "@/db/migrations";

/**
 * The typed schema, INFERRED from the migration builder chain in
 * `@/db/migrations`. There is no codegen step and no schema file — if you change
 * a column there, the types here change on the next `tsc`.
 *
 * Row types come out as `AppDatabase["users"]` etc. Convenience aliases for
 * every table are exported below; prefer those.
 */
export type AppDatabase = DatabaseType<typeof migrations>;

/**
 * The one and only database handle. Import it as `import { db } from "@/db"`.
 *
 * It is a Kysely instance — NOT Prisma. There is no `db.user.findUnique`, no
 * `include:`, no lazy relations. See the query examples in the header comments
 * of this file's sibling modules and in the agent contract.
 */
export const db = createDb<AppDatabase>(env.DATABASE, "class-kudos-db");

/* -------------------------------------------------------------------------- */
/* Row types — the SELECT shape of each table.                                 */
/*                                                                             */
/* Remember what SQLite gives you:                                             */
/*   - booleans are `number` (0 / 1)   -> archived, isActive, responseRequired, */
/*                                        reviewed                             */
/*   - timestamps are `string` ISO-8601 -> createdAt, updatedAt, arrivedAt, ... */
/* Convert at the boundary with the helpers in `@/lib/sqlite`.                 */
/* -------------------------------------------------------------------------- */

export type UserRow = AppDatabase["users"];
export type GroupRow = AppDatabase["groups"];
export type LocationRow = AppDatabase["locations"];
export type EnrollmentRow = AppDatabase["enrollments"];
export type ClassCodeRow = AppDatabase["classCodes"];
export type KudosTypeRow = AppDatabase["kudosTypes"];
export type KudosRow = AppDatabase["kudos"];
export type RewardRow = AppDatabase["rewards"];
export type RedeemedRow = AppDatabase["redeemed"];
export type LocationHistoryRow = AppDatabase["locationHistory"];

/* -------------------------------------------------------------------------- */
/* Text-column unions. SQLite has no enums; these are the ONLY legal values.   */
/* -------------------------------------------------------------------------- */

/** `users.role` */
export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

/** `groups.codeMode` — which kind of class code this group currently accepts. */
export type CodeMode = "shared" | "individual";

/** `classCodes.kind` */
export type CodeKind = "group" | "student";

export const USER_ROLES: readonly UserRole[] = ["ADMIN", "TEACHER", "STUDENT"];
export const CODE_MODES: readonly CodeMode[] = ["shared", "individual"];
export const CODE_KINDS: readonly CodeKind[] = ["group", "student"];

/**
 * Narrow a raw text column to its union. Nothing in the database enforces these
 * values, so parse rather than cast whenever the value came out of a row and is
 * about to drive a branch.
 */
export function parseUserRole(value: string): UserRole {
  if (value === "ADMIN" || value === "TEACHER" || value === "STUDENT") {
    return value;
  }
  throw new Error(`Invalid users.role value: ${JSON.stringify(value)}`);
}

export function parseCodeMode(value: string): CodeMode {
  if (value === "shared" || value === "individual") {
    return value;
  }
  throw new Error(`Invalid groups.codeMode value: ${JSON.stringify(value)}`);
}

export function parseCodeKind(value: string): CodeKind {
  if (value === "group" || value === "student") {
    return value;
  }
  throw new Error(`Invalid classCodes.kind value: ${JSON.stringify(value)}`);
}

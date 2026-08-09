/**
 * SQLite value conversion — the ONE place booleans and dates cross the boundary.
 *
 * SQLite (and therefore rwsdk/db) has no boolean type and no date type:
 *   - booleans are `integer` 0 / 1
 *   - timestamps are `text` holding an ISO-8601 string
 *
 * Do NOT scatter `Boolean(row.archived)` and `new Date(row.createdAt)` across
 * components. Convert once, at the query boundary, in the mapper for that table.
 */

/** DB integer (0/1) -> JS boolean. Anything non-zero is true. */
export function toBool(value: number | null | undefined): boolean {
  return Boolean(value);
}

/** JS boolean -> DB integer (0/1). Use this in every `.values()` / `.set()`. */
export function fromBool(value: boolean | null | undefined): number {
  return value ? 1 : 0;
}

/** DB ISO-8601 text -> Date. */
export function toDate(value: string): Date;
export function toDate(value: string | null | undefined): Date | null;
export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date (or now) -> DB ISO-8601 text. */
export function fromDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * The current timestamp in DB form. Every INSERT must supply its own
 * `createdAt`/`updatedAt` — there are no column defaults for timestamps.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * A new primary key. Every table uses a text `id` that the application
 * generates; SQLite is never asked to produce one.
 */
export function newId(): string {
  return crypto.randomUUID();
}

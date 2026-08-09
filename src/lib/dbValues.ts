/**
 * Value helpers for the database boundary.
 *
 * This file used to be `src/lib/sqlite.ts` and existed mostly to paper over two
 * things SQLite does not have:
 *
 *   - booleans, which were stored as integer 0 / 1
 *   - dates, which were stored as ISO-8601 text
 *
 * Postgres has both. `toBool` / `fromBool` / `toDate` / `fromDate` are therefore
 * GONE — a boolean column now arrives as a `boolean` and a `timestamptz` as a
 * `Date`, with no conversion at the boundary and no chance of a stray
 * `Boolean(row.archived)` drifting into a component.
 *
 * What remains is genuinely still useful.
 */

/**
 * The current timestamp.
 *
 * Every table now carries `default now()`, so most inserts could simply omit
 * their timestamps. They are still passed explicitly for the moment: moving to
 * database-generated values changes the insert types and means adding
 * `.returning(...)` where the value is read back, which is a separate and
 * independently revertable change.
 *
 * Returns a string because `timestamptz` accepts ISO-8601 and every existing
 * call site already treats it as one.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * A new primary key.
 *
 * Every table also has `default gen_random_uuid()`, so this is likewise
 * optional now — but generating the id in application code means the caller
 * knows it without a round trip, which several call sites rely on.
 */
export function newId(): string {
  return crypto.randomUUID();
}

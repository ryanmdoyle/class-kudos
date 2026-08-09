/**
 * Pure formatting. No DB, no env — importable from client components.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * A Date (or ISO-8601 string) -> "Aug 8, 2026".
 *
 * Formatted from the UTC parts ON PURPOSE. `toLocaleDateString()` would render
 * against the worker's timezone during the server render and the child's
 * timezone on the client, which is exactly the kind of hydration mismatch that
 * bit the teacher dashboard. This is deterministic everywhere.
 *
 * The cost is that a kudo awarded late in the evening in a US timezone reads as
 * the next day. Fixing that properly needs a per-group timezone, which the
 * schema does not have; the legacy app had the same behaviour
 * (`Date.toDateString()` on a UTC worker).
 */
export function formatShortDate(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** "1 kudo" / "2 kudos" — children read the singular as a typo otherwise. */
export function pluralKudos(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? "kudo" : "kudos"}`;
}

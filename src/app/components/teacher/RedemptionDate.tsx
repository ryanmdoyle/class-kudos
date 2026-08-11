"use client";

/**
 * Render a timestamp in the VIEWER's timezone.
 *
 * A client component on purpose: the worker's clock is UTC, so formatting on the
 * server would show a teacher in Los Angeles the wrong day for anything
 * requested after 4pm.
 *
 * `suppressHydrationWarning` because the server-rendered pass and the browser
 * pass legitimately produce different strings.
 */
export function RedemptionDate({ value }: { value: Date | string }) {
  // Postgres hands back a Date. The string branch remains because this is a
  // client component and a plain ISO string may still be passed; a bare string
  // without a zone is assumed UTC, as the database always stored it.
  const date =
    value instanceof Date
      ? value
      : new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);

  if (Number.isNaN(date.getTime())) {
    return <span>{String(value)}</span>;
  }

  return (
    <span suppressHydrationWarning>
      {date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  );
}

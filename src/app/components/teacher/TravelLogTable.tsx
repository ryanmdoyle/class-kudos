"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import type { TravelLogRow } from "@/app/components/teacher/types";

/**
 * Client component so the timestamps render in the VIEWER's timezone. Formatting
 * them on the server would use the worker's clock (UTC), which is wrong for
 * every teacher on earth.
 */
/**
 * Postgres returns a Date. The string branch stays because this is a client
 * component: a bare ISO string without a zone is assumed UTC, which is how the
 * database always stored it. Without that fallback a bare
 * "2026-01-01 09:00:00" would be parsed as LOCAL time and shift the whole log
 * by the teacher's UTC offset.
 */
function parseIso(value: Date | string): Date {
  if (value instanceof Date) return value;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

function formatTime(value: Date | string): string {
  const date = parseIso(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(trip: TravelLogRow): string {
  if (trip.duration != null) {
    return `${trip.duration} min`;
  }
  if (!trip.leftAt) return "still out";

  const minutes = Math.round(
    (parseIso(trip.leftAt).getTime() - parseIso(trip.arrivedAt).getTime()) /
      60000,
  );
  return Number.isFinite(minutes) ? `${minutes} min` : "—";
}

export function TravelLogTable({ trips }: { trips: TravelLogRow[] }) {
  return (
    <Table>
      {trips.length === 0 ? (
        <TableCaption className="text-foreground">
          Nothing here yet. Entries appear when students sign out to a location.
        </TableCaption>
      ) : null}
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Left at</TableHead>
          <TableHead className="text-right">Time away</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trips.map((trip) => (
          <TableRow key={trip.id} className="bg-background">
            <TableCell>
              {trip.firstName} {trip.lastName}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-[2px] border border-border"
                  style={{ backgroundColor: trip.locationColor || "#808080" }}
                />
                {trip.locationName}
              </span>
            </TableCell>
            <TableCell className="font-base">
              {formatTime(trip.arrivedAt)}
            </TableCell>
            <TableCell className="text-right">{formatDuration(trip)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

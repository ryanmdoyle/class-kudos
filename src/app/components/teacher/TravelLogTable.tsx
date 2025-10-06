"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type TravelLogTrip = {
  id: string;
  arrivedAt: string | Date;
  user: {
    firstName: string;
    lastName: string;
  };
  location: {
    name: string;
  };
};

export function TravelLogTable({ trips }: { trips: TravelLogTrip[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trips.map((trip) => {
          const arrivedAtStr =
            typeof trip.arrivedAt === "string"
              ? trip.arrivedAt
              : trip.arrivedAt.toISOString();

          const safeDate =
            arrivedAtStr.endsWith("Z") || arrivedAtStr.includes("+")
              ? arrivedAtStr
              : arrivedAtStr + "Z";

          return (
            <TableRow key={trip.id} className="bg-background">
              <TableCell>
                {trip.user.firstName} {trip.user.lastName}
              </TableCell>
              <TableCell>{trip.location.name}</TableCell>
              <TableCell className="font-base">
                {new Date(safeDate).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
"use client";

import { EnrollmentWithUserLocation } from "@/app/lib/types";
import { Location } from "@generated/prisma";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { MapPin } from "lucide-react";
import { updateLocation } from "./functions";

const handleUpdate = async (enrollmentId: string, locationId: string | null) => {
  await updateLocation(enrollmentId, locationId);
};

export function TravelButton({
  enrollment,
  locations,
}: {
  enrollment: EnrollmentWithUserLocation;
  locations: Location[];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="neutral"
          className="min-h-[60px] flex flex-col items-center justify-center gap-1 m-0"
          key={enrollment.id}
        >
          {/* Student name */}
          <span>{enrollment.user.firstName}</span>

          {/* Tag bubble if they are currently at a location */}
          {enrollment.currentLocationId && (
            <span
              className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: enrollment.currentLocation?.color || "bg-background",
              }}
            >
              <MapPin className="w-3 h-3" />
              {enrollment.currentLocation?.name}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{enrollment.currentLocationId ? "Welcome Back!" : "Where are you headed?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {enrollment.currentLocationId ? "Confirm you are returning to class." : "Select the location you are going to:"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {enrollment.currentLocationId ? (
          <Button onClick={() => handleUpdate(enrollment.id, null)}>I'm back!</Button>
        ) : (
          locations.map((location) => (
            <Button
              className="mb-0"
              style={{ backgroundColor: location.color || "bg-background" }}
              onClick={() => handleUpdate(enrollment.id, location.id)}
              key={location.id}
            >
              {location.name}
            </Button>
          ))
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

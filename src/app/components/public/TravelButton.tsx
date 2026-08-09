"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/app/components/ui/button";
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

import { readableTextColor, swatchBackground } from "./color";
import { updateTravelLocation } from "./functions";
import type { BoardLocation, BoardStudent } from "./types";

/**
 * One child's tile on the classroom board.
 *
 * Audience is a 9-year-old standing at a shared screen, so:
 *  - the tile is a single large target (no nested controls to mis-tap),
 *  - there are exactly two states — "in class" or "at <place>",
 *  - coming back is ONE button, not a menu,
 *  - a failure says so in words on the tile and puts the old value back, so
 *    the screen never quietly disagrees with the room.
 */
export function TravelButton({
  student,
  locations,
  groupPublicId,
  onLocalUpdate,
}: {
  student: BoardStudent;
  locations: BoardLocation[];
  groupPublicId: string;
  onLocalUpdate: (
    enrollmentId: string,
    location: BoardLocation | null,
  ) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOut = student.locationId !== null;

  const handleUpdate = async (location: BoardLocation | null) => {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    // Remember enough to put the tile back exactly as it was.
    const previous: BoardLocation | null = student.locationId
      ? {
          id: student.locationId,
          name: student.locationName ?? "",
          color: student.locationColor,
        }
      : null;

    // Optimistic: the tile flips before the round trip, because the child is
    // already walking away from the screen.
    onLocalUpdate(student.enrollmentId, location);
    setOpen(false);

    try {
      const result = await updateTravelLocation(
        groupPublicId,
        student.enrollmentId,
        location?.id ?? null,
      );

      if (!result.ok) {
        onLocalUpdate(student.enrollmentId, previous);
        setError(result.error);
      }
    } catch {
      onLocalUpdate(student.enrollmentId, previous);
      setError("That didn't save. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={isOut ? "neutral" : "default"}
            className="h-auto min-h-[84px] w-full flex-col items-center justify-center gap-1 whitespace-normal px-3 py-3 text-lg font-bold"
            disabled={isPending}
            aria-label={
              isOut
                ? `${student.firstName} is at ${student.locationName}. Tap to come back to class.`
                : `${student.firstName} is in class. Tap to sign out.`
            }
          >
            <span className="leading-tight">
              {student.firstName}
              {student.lastInitial ? ` ${student.lastInitial}.` : ""}
            </span>
            {isOut ? (
              <span
                className="flex items-center gap-1 rounded-base border-2 border-border px-2 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: swatchBackground(student.locationColor),
                  color: readableTextColor(student.locationColor),
                }}
              >
                <MapPin className="h-3 w-3" />
                {student.locationName}
              </span>
            ) : null}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {isOut
                ? `Welcome back, ${student.firstName}!`
                : `Where are you going, ${student.firstName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {isOut
                ? "Tap the button to sign back into class."
                : locations.length > 0
                  ? "Tap the place you are going to."
                  : "Your teacher hasn't set up any places yet."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3">
            {isOut ? (
              <Button
                variant="green"
                className="h-16 w-full text-xl font-bold"
                onClick={() => void handleUpdate(null)}
                disabled={isPending}
              >
                I&apos;m back!
              </Button>
            ) : (
              locations.map((location) => (
                <Button
                  key={location.id}
                  className="h-16 w-full text-xl font-bold"
                  style={{
                    backgroundColor: swatchBackground(location.color),
                    color: readableTextColor(location.color),
                  }}
                  onClick={() => void handleUpdate(location)}
                  disabled={isPending}
                >
                  {location.name}
                </Button>
              ))
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="h-12 text-base">
              Never mind
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error ? (
        <p
          role="status"
          className="rounded-base border-2 border-border bg-error px-2 py-1 text-center text-xs font-bold text-main-foreground"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  readableTextColor,
  swatchBackground,
} from "@/app/components/public/color";
import type { BoardLocation } from "@/app/components/public/types";

import { setMyLocation } from "./functions";
import { refreshPage } from "./refresh";

/**
 * "Where am I?" on the student's own group page.
 *
 * Same job as a tile on the public classroom board, but signed in: the action
 * takes only a group id and resolves the enrollment from the session, so a
 * child can only ever move themselves.
 *
 * Laid out flat — every choice is a full-width 64px button, visible without
 * opening anything. A confirmation dialog would be one more thing to get wrong
 * on the way out of the door.
 */
export function MyLocationPicker({
  groupId,
  locations,
  locationId: initialLocationId,
  locationName: initialLocationName,
  locationColor: initialLocationColor,
}: {
  groupId: string;
  locations: BoardLocation[];
  locationId: string | null;
  locationName: string | null;
  locationColor: string | null;
}) {
  const [current, setCurrent] = useState<BoardLocation | null>(
    initialLocationId
      ? {
          id: initialLocationId,
          name: initialLocationName ?? "",
          color: initialLocationColor,
        }
      : null,
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = async (location: BoardLocation | null) => {
    if (isPending) return;

    const previous = current;
    setIsPending(true);
    setError(null);
    setCurrent(location);

    try {
      const result = await setMyLocation({
        groupId,
        locationId: location?.id ?? null,
      });

      if (result.ok) {
        void refreshPage();
      } else {
        setCurrent(previous);
        setError(result.error);
      }
    } catch {
      setCurrent(previous);
      setError("That didn't save. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  if (locations.length === 0 && current === null) {
    return (
      <p className="text-base opacity-70">
        Your teacher hasn&apos;t set up any places to sign out to yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {current ? (
        <>
          <p className="flex items-center gap-2 text-lg">
            You are signed out to
            <span
              className="inline-flex items-center gap-1 rounded-base border-2 border-border px-3 py-1 font-bold"
              style={{
                backgroundColor: swatchBackground(current.color),
                color: readableTextColor(current.color),
              }}
            >
              <MapPin className="h-4 w-4" />
              {current.name}
            </span>
          </p>
          <Button
            variant="green"
            className="h-16 w-full text-xl font-bold"
            onClick={() => void move(null)}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "I'm back in class"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-lg">You are in class. Going somewhere?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {locations.map((location) => (
              <Button
                key={location.id}
                className="h-16 w-full text-xl font-bold"
                style={{
                  backgroundColor: swatchBackground(location.color),
                  color: readableTextColor(location.color),
                }}
                onClick={() => void move(location)}
                disabled={isPending}
              >
                {location.name}
              </Button>
            ))}
          </div>
        </>
      )}

      {error ? (
        <p
          role="status"
          className="rounded-base border-2 border-border bg-error px-3 py-2 text-base font-bold text-main-foreground"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

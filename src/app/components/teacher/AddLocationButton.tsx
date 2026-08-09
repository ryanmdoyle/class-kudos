"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { addLocation } from "@/app/components/teacher/functions";

export function AddLocationButton({ groupId }: { groupId: string }) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await addLocation(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">
          Add Location
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Location</AlertDialogTitle>
          <AlertDialogDescription>
            Somewhere students can sign out to. The colour is what shows on the
            public travel-log board.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addLocationForm" className="space-y-4">
          <Input
            id="name"
            type="text"
            name="name"
            placeholder="Location name (e.g. Library, Cafeteria)"
            required
          />
          <Input
            id="description"
            type="text"
            name="description"
            placeholder="Description (optional)"
          />
          <div>
            <label htmlFor="color" className="block text-sm font-medium mb-2">
              Choose a color
            </label>
            <input
              id="color"
              type="color"
              name="color"
              defaultValue="#3B82F6"
              className="w-full h-10 rounded border border-border cursor-pointer"
              required
            />
          </div>
          <input type="hidden" name="groupId" value={groupId} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addLocationForm">
            Create Location
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

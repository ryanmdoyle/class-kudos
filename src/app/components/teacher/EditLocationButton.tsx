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
import {
  deleteLocation,
  editLocation,
} from "@/app/components/teacher/functions";
import type { LocationRow } from "@/db";

export function EditLocationButton({ location }: { location: LocationRow }) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await editLocation(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  const handleDelete = async () => {
    const result = await deleteLocation(location.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">
          Edit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {location.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Removing a location retires it rather than deleting it, so past
            travel-log entries still say where the student went.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editLocationForm" className="space-y-4">
          <Input
            id="name"
            type="text"
            name="name"
            defaultValue={location.name}
            required
          />
          <Input
            id="description"
            type="text"
            name="description"
            defaultValue={location.description ?? ""}
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
              defaultValue={location.color || "#3B82F6"}
              className="w-full h-10 rounded border border-border cursor-pointer"
              required
            />
          </div>
          <input type="hidden" name="id" value={location.id} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter className="relative">
          <form action={handleDelete} id="deleteLocationForm">
            <Button
              type="submit"
              className="bg-red-400 absolute left-0"
              form="deleteLocationForm"
            >
              Remove
            </Button>
          </form>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editLocationForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

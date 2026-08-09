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
import { addKudoType } from "@/app/components/teacher/functions";

export function AddKudoTypeButton({ groupId }: { groupId: string }) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await addKudoType(formData);
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
          Add Kudo Type
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Kudo Type</AlertDialogTitle>
          <AlertDialogDescription>
            A short name and how many points it is worth.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addKudoTypeForm" className="space-y-2">
          <Input id="name" type="text" name="name" placeholder="name" required />
          <Input
            id="value"
            type="number"
            name="value"
            placeholder="value"
            required
            min={1}
            step={1}
          />
          {/* The server re-checks that this group belongs to the current teacher. */}
          <input type="hidden" name="groupId" value={groupId} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addKudoTypeForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

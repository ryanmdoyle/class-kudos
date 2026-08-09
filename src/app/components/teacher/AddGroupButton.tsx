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
import { link } from "@/app/shared/links";
import { addGroup } from "@/app/components/teacher/functions";

export function AddGroupButton() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await addGroup(formData);

    if (!result.success || !result.data) {
      setError(result.error ?? "Could not create that group.");
      return;
    }

    // Straight into the new group: it already has a shared class code.
    window.location.href = link("/teacher/:groupId", {
      groupId: result.data.id,
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute bottom-0 right-4">Add Group</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Group</AlertDialogTitle>
          <AlertDialogDescription>
            Name your class. A shared class code is created with it, so you can
            get students logging in straight away.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addGroupForm">
          <Input
            id="name"
            type="text"
            name="name"
            placeholder="e.g. Period 1"
            required
          />
          {error ? <p className="text-red-500 mt-2">{error}</p> : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addGroupForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
  deleteKudoType,
  editKudoType,
} from "@/app/components/teacher/functions";
import type { KudosTypeRow } from "@/db";

export function EditKudoTypeButton({ kudoType }: { kudoType: KudosTypeRow }) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await editKudoType(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  const handleDelete = async () => {
    const result = await deleteKudoType(kudoType.id);
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
          <AlertDialogTitle>Edit {kudoType.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Kudos already awarded keep the name and value they were given with —
            editing this only changes what future awards look like.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editKudoTypeForm" className="space-y-2">
          <Input
            id="name"
            type="text"
            name="name"
            defaultValue={kudoType.name}
            required
          />
          <Input
            id="value"
            type="number"
            name="value"
            defaultValue={kudoType.value}
            required
          />
          {/* Ownership is resolved from this id server-side, not from the client. */}
          <input type="hidden" name="id" value={kudoType.id} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter className="relative">
          <form action={handleDelete} id="deleteKudoTypeForm">
            <Button
              type="submit"
              className="bg-red-400 absolute left-0"
              form="deleteKudoTypeForm"
            >
              Delete
            </Button>
          </form>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editKudoTypeForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

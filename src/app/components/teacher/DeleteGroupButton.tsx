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
import { archiveGroup } from "@/app/components/teacher/functions";

/**
 * "Archive", not "delete": the row and everything under it is kept, the group
 * just stops appearing and its class codes stop working.
 *
 * The typed-name confirmation is client-side UX only. The real protection is
 * `archiveGroup`, which calls `assertTeacherOwnsGroup` server-side.
 */
export function DeleteGroupButton({
  group,
}: {
  group: { id: string; name: string };
}) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const typedName = formData.get("name")?.toString() ?? "";

    if (typedName.trim() !== group.name) {
      setError("Group name does not match. Action canceled.");
      return;
    }

    const result = await archiveGroup(group.id);

    if (!result.success) {
      setError(`Failed to archive: ${result.error}`);
      return;
    }

    setError(null);
    window.location.href = link("/teacher");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2 bg-red-400">
          Archive Group
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive group “{group.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The group disappears from your dashboard and its class codes stop
            working immediately. Type the group name to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="archiveGroupForm">
          <Input
            id="name"
            type="text"
            name="name"
            placeholder={group.name}
            required
          />
          {error ? <p className="text-red-500 mt-2">{error}</p> : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="archiveGroupForm">
            Archive Group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

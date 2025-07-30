"use client";

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
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '../ui/input'
import { archiveGroup } from './functions';
import { Group } from '@generated/prisma';
import { useState } from 'react';
import { link } from '@/app/shared/links';


export function DeleteGroupButton({ group }: { group: Group }) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    const name = formData.get("name")?.toString();
    const id = formData.get("id")?.toString();

    if (!id || name !== group.name) {
      setError("Group name does not match. Action canceled.");
      return;
    }

    const res = await archiveGroup(id);
    if (!res.success) {
      setError(`Failed to archive: ${res.error}`);
    } else {
      window.location.href = link('/teacher')
      setError(null);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2 bg-red-400">Archive Group</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Group {group.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            You cannot undo this action!  Type in the Group Name to continue.
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
          {error && (
            <p className="text-red-500">{error}</p>
          )}
          <input type="hidden" name="id" value={group.id} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="archiveGroupForm">Delete Group</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
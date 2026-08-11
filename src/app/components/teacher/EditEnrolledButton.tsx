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
  editEnrolled,
  removeEnrollment,
} from "@/app/components/teacher/functions";
import type { EnrollmentWithUser } from "@/app/lib/types";

export function EditEnrolledButton({
  enrollment,
}: {
  enrollment: EnrollmentWithUser;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const result = await editEnrolled(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  const handleRemove = async () => {
    const result = await removeEnrollment(enrollment.groupId, enrollment.id);
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
          <AlertDialogTitle>
            Edit {enrollment.user.firstName} {enrollment.user.lastName}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Removing a student deletes their points, kudos history and class code
            for this group. If they are not in any of your other groups their
            account is deleted too.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editEnrolledForm" className="space-y-2">
          <Input
            id="firstName"
            type="text"
            name="firstName"
            defaultValue={enrollment.user.firstName}
            required
          />
          <Input
            id="lastName"
            type="text"
            name="lastName"
            defaultValue={enrollment.user.lastName}
            required
          />
          <input type="hidden" name="userId" value={enrollment.user.id} />
          <input type="hidden" name="groupId" value={enrollment.groupId} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter className="relative">
          <form action={handleRemove} id="removeEnrollmentForm">
            <Button
              type="submit"
              className="bg-red-400 absolute left-0"
              form="removeEnrollmentForm"
            >
              Remove
            </Button>
          </form>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editEnrolledForm">
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

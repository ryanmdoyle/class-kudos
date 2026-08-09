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
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";

/**
 * Reset ONE student's personal code.
 *
 * Deliberately behind a confirmation: the old code stops working the instant
 * this runs, so a student holding a printed card can no longer get in until they
 * are given the new one. This is the "lost card" / "the code got passed around"
 * button, not a routine one.
 *
 * It does not talk to the database itself — the owning panel holds the whole
 * code list as state and calls the server action, so one round trip refreshes
 * every row.
 */
export function StudentAccessCodeButton({
  studentName,
  hasCode,
  onReset,
  disabled = false,
}: {
  studentName: string;
  hasCode: boolean;
  onReset: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="neutral"
          size="sm"
          className={`m-0 ${hasCode ? "bg-red-400" : ""}`}
          disabled={disabled}
        >
          {hasCode ? "Reset" : "Generate"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasCode ? `Reset ${studentName}'s code?` : `Generate a code for ${studentName}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasCode
              ? "Their current code stops working immediately. Anything already printed for this student will need reprinting."
              : "This creates a personal login code for this student."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onReset()}>
            {hasCode ? "Reset code" : "Generate code"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

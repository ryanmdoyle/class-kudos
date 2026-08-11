"use client";

import { RefreshCw } from "lucide-react";

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
 * Bulk code generation for a whole class.
 *
 * The legacy version was a bare `window.confirm` that regenerated everything
 * unconditionally — which silently invalidated every card the class was already
 * holding. It now offers the two operations separately, because they are not the
 * same thing:
 *
 *   "Generate missing"  — only students with no code. Safe, and the common case
 *                         after adding students mid-year.
 *   "Regenerate ALL"    — every student gets a new code and every printed card
 *                         in the room becomes waste paper. Destructive, so it is
 *                         a distinct button behind its own confirmation.
 */
export function GenerateClassAccessButton({
  missingCount,
  totalCount,
  onGenerateMissing,
  onRegenerateAll,
  disabled = false,
}: {
  missingCount: number;
  totalCount: number;
  onGenerateMissing: () => void | Promise<void>;
  onRegenerateAll: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="green"
        size="sm"
        disabled={disabled || missingCount === 0}
        onClick={() => void onGenerateMissing()}
      >
        <RefreshCw />
        {missingCount === 0
          ? "Everyone has a code"
          : `Generate ${missingCount} missing`}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="neutral"
            size="sm"
            className="bg-red-400"
            disabled={disabled || totalCount === 0}
          >
            Regenerate all
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Regenerate codes for all {totalCount} students?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every existing code stops working immediately. Anything you have
              already printed or handed out becomes invalid and the whole class
              will need new cards. If you only want to cover students who do not
              have a code yet, use “Generate missing” instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onRegenerateAll()}>
              Regenerate all codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

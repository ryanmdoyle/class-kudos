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
} from "@/app/components/ui/alert-dialog"

import { Button } from "@/app/components/ui/button"
import { createStudentAccessCode } from './functions';

export function StudentAccessCodeButton({ userId }: { userId: string }) {
  const handleReset = async (userId: string) => {
    await createStudentAccessCode(userId)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2 bg-red-400">
          Regenerate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>"Are you absolutely sure?"</AlertDialogTitle>
          <AlertDialogDescription>
            <span>This will generate a new code you can share with your student to login.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => { handleReset(userId) }} type="button">Generate Access Code</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
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
import { createStudentResetCode } from './functions';
import { useState } from "react";

export function CreateResetCodeButton({ userId }: { userId: string }) {
  const [code, setCode] = useState<string | null>(null)

  const handleReset = async (userId: string) => {
    const newCode = await createStudentResetCode(userId)
    if (newCode.code) {
      setCode(newCode.code)
      // Clear the code after 5 minutes (300,000 ms)
      setTimeout(() => {
        setCode(null);
      }, 1000 * 60 * 5);
    }
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {code ? <strong className="mr-2 text-lg">{code}</strong> : (
            <Button variant="neutral" size="sm" className="m-0 mr-2 bg-red-400">
              Reset
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{code ? "Current Reset Code:" : "Are you absolutely sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {code ?
                <p className="text-3xl">
                  {code}
                </p>
                :
                <p>This action cannot be undone. The currrent passkey for the student will be deleted, and a code will be generated to allow the student to reset their passkey.  <strong>The code will last 5 minutes.</strong></p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { handleReset(userId) }} type="button">Generate {code ? "New Reset" : "Reset"} Code</AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
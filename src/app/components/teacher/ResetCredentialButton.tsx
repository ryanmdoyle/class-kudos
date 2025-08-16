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
import { useState } from "react";

export function CreateAccessCodeButton({ userId }: { userId: string }) {
  const [code, setCode] = useState<string | null>(null)

  const handleReset = async (userId: string) => {
    const newCode = await createStudentAccessCode(userId)
    if (newCode.code) {
      setCode(newCode.code)
      // Clear the code after 15 minutes
      setTimeout(() => {
        setCode(null);
      }, 1000 * 60 * 15);
    }
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {code ? <strong className="mr-2 text-lg">{code}</strong> : (
            <Button variant="neutral" size="sm" className="m-0 mr-2 bg-red-400">
              Generate
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{code ? "Current Code:" : "Are you absolutely sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {code ?
                <p className="text-3xl">
                  {code}
                </p>
                :
                <p>This will generate a code you can share with your student to login.  <strong>The code will last 15 minutes.</strong></p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { handleReset(userId) }} type="button">Generate Access Code</AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
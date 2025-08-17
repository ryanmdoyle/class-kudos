"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { useState } from "react";
import { Name } from "@/app/lib/types";

export function RandomStudentButton({ names }: { names: Name[] }) {
  const [student, setStudent] = useState<string>("")

  function getRandomUser() {
    // Check if array is empty or invalid
    if (!names || names.length === 0) {
      return null;
    }

    // Get random index
    const randomIndex = Math.floor(Math.random() * names.length);

    // Get the random user object
    const randomUserEntry = names[randomIndex];

    // Return the first and last name
    return {
      firstName: randomUserEntry.firstName,
      lastName: randomUserEntry.lastName,
      fullName: `${randomUserEntry.firstName} ${randomUserEntry.lastName}`
    };
  }

  function handleRandomStudentButton() {
    const user = getRandomUser()
    setStudent(user?.fullName || "")
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" onClick={handleRandomStudentButton}>Select Random Student</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{student}</AlertDialogTitle>
          <AlertDialogDescription>
            You have been chosen!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
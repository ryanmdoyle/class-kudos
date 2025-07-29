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
import { addEnrollment } from './functions'

const handleSubmit = async (formData: FormData) => {
  addEnrollment(formData)
}

export function AddEnrollmentButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute bottom-0 right-4">Enroll in Group</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enroll in a Group</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the enrollment code for the group you are joining.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addEnrollmentForm">
          <Input
            id="enrollId"
            type="text"
            name="enrollId"
            placeholder="enroll code"
            required
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addEnrollmentForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
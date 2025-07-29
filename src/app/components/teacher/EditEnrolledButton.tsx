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
import { EnrollmentWithUser } from '@/app/lib/types'
import { editEnrolled } from './functions';

const handleSubmit = async (formData: FormData) => {
  editEnrolled(formData)
}

export function EditEnrolledButton({ enrollment }: { enrollment: EnrollmentWithUser }) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">Edit</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {enrollment.user.firstName}</AlertDialogTitle>
          <AlertDialogDescription>
            You can edit the enrolled user here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editEnrolledForm">
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
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editEnrolledForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
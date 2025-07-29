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
import { addKudoType } from './functions'

const handleSubmit = async (formData: FormData) => {
  addKudoType(formData)
}

interface AddKudoTypeButtonProps {
  groupId: string;
}

export function AddKudoTypeButton({ groupId }: AddKudoTypeButtonProps) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">Add Kudo Type</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Kudo Type Option</AlertDialogTitle>
          <AlertDialogDescription>
            Add a name for your "kudo type."
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addKudoTypeForm">
          <Input
            id="name"
            type="name"
            name="name"
            placeholder="name"
            required
          />
          <Input
            id="value"
            type="number"
            name="value"
            placeholder="value"
            required
            min={1}
            step={1}
          />
          <input type="hidden" name="groupId" value={groupId} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addKudoTypeForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
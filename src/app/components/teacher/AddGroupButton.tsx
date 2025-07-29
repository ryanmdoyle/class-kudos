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
import { addGroup } from './functions'

const handleSubmit = async (formData: FormData) => {
  addGroup(formData)
}

export function AddGroupButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute bottom-0 right-4">Add Group</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Group</AlertDialogTitle>
          <AlertDialogDescription>
            Add a name for your group.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addGroupForm">
          <Input
            id="name"
            type="name"
            name="name"
            placeholder="name"
            required
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addGroupForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  )
}
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
import { KudosType } from '@generated/prisma';
import { editKudoType, deleteKudoType } from './functions';

const handleSubmit = async (formData: FormData) => {
  editKudoType(formData)
}

export function EditKudoTypeButton({ kudoType }: { kudoType: KudosType }) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">Edit</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {kudoType.name}</AlertDialogTitle>
          <AlertDialogDescription>
            You can edit the kudo name and value here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editKudoTypeForm">
          <Input
            id="name"
            type="text"
            name="name"
            defaultValue={kudoType.name}
            required
          />
          <Input
            id="value"
            type="number"
            name="value"
            defaultValue={kudoType.value}
            required
          />
          <input type="hidden" name="id" value={kudoType.id} />
        </form>
        <AlertDialogFooter className="relative">
          <Button onClick={() => { deleteKudoType(kudoType.id) }} className='bg-red-400 absolute left-0' form="editKudoTypeForm">Delete</Button>

          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editKudoTypeForm">Continue</AlertDialogAction>

        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
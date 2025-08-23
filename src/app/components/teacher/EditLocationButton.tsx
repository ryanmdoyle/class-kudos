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
import { Location } from '@generated/prisma';
import { editLocation, deleteLocation } from './functions';

const handleSubmit = async (formData: FormData) => {
  await editLocation(formData)
}

const handleDelete = async (locationId: string) => {
  await deleteLocation(locationId)
}

export function EditLocationButton({ location }: { location: Location }) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">Edit</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {location.name}</AlertDialogTitle>
          <AlertDialogDescription>
            You can edit the location here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editLocationForm">
          <div className="space-y-4">
            <Input
              id="name"
              type="text"
              name="name"
              defaultValue={location.name}
              required
            />
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                Choose a color
              </label>
              <input
                id="color"
                type="color"
                name="color"
                defaultValue={location.color || "#3B82F6"}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                required
              />
            </div>
          </div>
          <input type="hidden" name="id" value={location.id} />
        </form>
        <AlertDialogFooter className="relative">
          <form action={() => handleDelete(location.id)} id="deleteLocationForm">
            <Button type="submit" className='bg-red-400 absolute left-0' form="deleteLocationForm">Delete</Button>
          </form>

          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editLocationForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
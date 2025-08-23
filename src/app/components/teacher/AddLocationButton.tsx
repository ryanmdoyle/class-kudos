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
import { addLocation } from './functions'

const handleSubmit = async (formData: FormData) => {
  addLocation(formData)
}

interface AddLocationButtonProps {
  groupId: string;
}

export function AddLocationButton({ groupId }: AddLocationButtonProps) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">Add Location</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Location</AlertDialogTitle>
          <AlertDialogDescription>
            Add a name and color for where students can travel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addLocationForm">
          <div className="space-y-4">
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="Location name (e.g., Library, Cafeteria)"
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
                defaultValue="#3B82F6"
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                required
              />
            </div>
          </div>
          <input type="hidden" name="groupId" value={groupId} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addLocationForm">Create Location</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
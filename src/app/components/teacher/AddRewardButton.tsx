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
import { addReward } from './functions'

const handleSubmit = async (formData: FormData) => {
  addReward(formData)
}

interface AddRewardButtonProps {
  groupId: string;
}

export function AddRewardButton({ groupId }: AddRewardButtonProps) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">Add Reward</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Reward Option</AlertDialogTitle>
          <AlertDialogDescription>
            Add a name for your "reward."
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addRewardForm">
          <Input
            id="name"
            type="name"
            name="name"
            placeholder="name"
            required
          />
          <Input
            id="cost"
            type="number"
            name="cost"
            placeholder="cost"
            required
            min={1}
            step={1}
          />
          <input type="hidden" name="groupId" value={groupId} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addRewardForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
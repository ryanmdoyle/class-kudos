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
import { Reward } from '@generated/prisma';
import { editReward, deleteReward } from './functions';

const handleSubmit = async (formData: FormData) => {
  await editReward(formData)
}

const handleDelete = async (rewardId: string) => {
  await deleteReward(rewardId)
}

export function EditRewardButton({ reward }: { reward: Reward }) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">Edit</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {reward.name}</AlertDialogTitle>
          <AlertDialogDescription>
            You can edit the reward name and cost here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editRewardForm">
          <Input
            id="name"
            type="text"
            name="name"
            defaultValue={reward.name}
            required
          />
          <Input
            id="cost"
            type="number"
            name="cost"
            defaultValue={reward.cost}
            required
          />
          <input type="hidden" name="id" value={reward.id} />
        </form>
        <AlertDialogFooter className="relative">
          <form action={() => handleDelete(reward.id)} id="deleteRewardForm">
            <Button type="submit" className='bg-red-400 absolute left-0' form="deleteRewardForm">Delete</Button>
          </form>

          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editRewardForm">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
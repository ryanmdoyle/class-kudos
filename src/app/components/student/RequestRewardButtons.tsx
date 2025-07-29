"use client";

import { Button } from '@/app/components/ui/button'
import { Reward } from '@generated/prisma';
import { requestReward } from './functions';
import { EnrollmentWithUser } from '@/app/lib/types';

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
} from "@/app/components/ui/alert-dialog"


export function RequestRewardButtons({ rewards, enrollment }: { rewards: Reward[], enrollment: EnrollmentWithUser }) {

  const handleSubmit = async (reward: Reward, enrollment: EnrollmentWithUser) => {
    requestReward(reward, enrollment)
  }

  return (
    <>
      {rewards && (
        rewards.map(reward => {
          if (!enrollment?.points || reward.cost > enrollment?.points) return (
            <Button onClick={() => { handleSubmit(reward, enrollment) }} key={reward.id} variant="gold" disabled>{reward.name} {reward.cost}</Button>
          )
          return (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button key={reward.id} variant="gold">{reward.name} {reward.cost}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a request for the <strong>{reward.name} reward</strong>, for a cost of <strong>{reward.cost} kudos</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { handleSubmit(reward, enrollment) }}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            // <Button onClick={() => { handleSubmit(reward, enrollment) }} key={reward.id} variant="gold" >{reward.name} {reward.cost}</Button>
          )
        })
      )}
    </>
  )
}
"use client";

import { Redeemed } from "@generated/prisma";
import { Button } from "../ui/button";
import { cancelRedeemed } from "./functions";

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

const handleSubmit = async (redeemed: Redeemed) => {
  cancelRedeemed(redeemed)
}

export function CancelRedeemedButton({ redeemed }: { redeemed: Redeemed }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-background m-0">Cancel</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove the requested reward and credit the student back with their kudos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { handleSubmit(redeemed) }}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

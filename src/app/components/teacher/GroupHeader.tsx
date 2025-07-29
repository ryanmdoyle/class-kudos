import { Group } from "@generated/prisma";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog"

export function GroupHeader({ group }: { group: Group }) {
  return (
    <div className="p-4 w-full h-[100px] bg-background neo-container flex justify-between items-center">
      <div className="flex flex-col min-w-1/2">
        <h1 className="text-3xl w-full">
          {group?.name}
        </h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <i className="text-gray-500 hover:text-purple-600 hover:underline">Enroll ID: {group.enrollId}</i>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl">Enroll ID: {group.enrollId} </AlertDialogTitle>
              <AlertDialogDescription>
                Use this code to have students join your group.
                They can enter the code once they log in to join.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="flex items-center gap-2 w-full justify-end">
        <span className="text-4xl text-end">
          {group?.rewardedPoints}
        </span>
        <img src="/images/coin.png" className="h-[65px]" />
      </div>
    </div>
  )
}
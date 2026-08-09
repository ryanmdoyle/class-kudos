"use client";

import { useState } from "react";

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
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { addReward } from "@/app/components/teacher/functions";

export function AddRewardButton({ groupId }: { groupId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [responseRequired, setResponseRequired] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const result = await addReward(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">
          Add Reward
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a New Reward</AlertDialogTitle>
          <AlertDialogDescription>
            What students can spend their kudos on, and how much it costs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="addRewardForm" className="space-y-2">
          <Input id="name" type="text" name="name" placeholder="name" required />
          <Input
            id="cost"
            type="number"
            name="cost"
            placeholder="cost"
            required
            min={1}
            step={1}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              id="responseRequired"
              type="checkbox"
              name="responseRequired"
              checked={responseRequired}
              onChange={(event) => setResponseRequired(event.target.checked)}
            />
            Ask the student a question when they redeem this
          </label>
          {responseRequired ? (
            <Input
              id="responsePrompt"
              type="text"
              name="responsePrompt"
              placeholder="e.g. Which song would you like?"
            />
          ) : null}
          <input type="hidden" name="groupId" value={groupId} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="addRewardForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

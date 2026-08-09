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
import { deleteReward, editReward } from "@/app/components/teacher/functions";
import type { RewardRow } from "@/db";

export function EditRewardButton({ reward }: { reward: RewardRow }) {
  const [error, setError] = useState<string | null>(null);
  // `responseRequired` is an integer 0/1 in SQLite — converted once, here.
  const [responseRequired, setResponseRequired] = useState(
    reward.responseRequired,
  );

  const handleSubmit = async (formData: FormData) => {
    const result = await editReward(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  const handleDelete = async () => {
    const result = await deleteReward(reward.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="neutral" size="sm" className="m-0 mr-2">
          Edit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit {reward.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Redemptions already requested keep the name and cost they were made
            with, so changing this does not rewrite anyone's history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleSubmit} id="editRewardForm" className="space-y-2">
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
              defaultValue={reward.responsePrompt ?? ""}
              placeholder="e.g. Which song would you like?"
            />
          ) : null}
          <input type="hidden" name="id" value={reward.id} />
          {error ? <p className="text-red-500">{error}</p> : null}
        </form>
        <AlertDialogFooter className="relative">
          <form action={handleDelete} id="deleteRewardForm">
            <Button
              type="submit"
              className="bg-red-400 absolute left-0"
              form="deleteRewardForm"
            >
              Delete
            </Button>
          </form>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="editRewardForm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

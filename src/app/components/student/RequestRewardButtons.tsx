"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

import { requestReward } from "./functions";
import { refreshPage } from "./refresh";
import type { StudentReward } from "./types";

/**
 * "Spend my kudos".
 *
 * The affordability check here is a KINDNESS, not a control — the real one is
 * the `points >= cost` predicate inside the UPDATE in `./functions`. Disabling
 * the button only saves the child a pointless tap.
 *
 * `points` is held in local state and corrected from the server's authoritative
 * balance on every response, so the number on screen and the number in the
 * database cannot drift while the page is open.
 */
export function RequestRewardButtons({
  groupId,
  rewards,
  points: initialPoints,
}: {
  groupId: string;
  rewards: StudentReward[];
  points: number;
}) {
  const [points, setPoints] = useState(initialPoints);
  const [notice, setNotice] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  if (rewards.length === 0) {
    return (
      <p className="text-base opacity-70">
        Your teacher hasn&apos;t added any rewards yet.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {notice ? (
        <p
          role="status"
          className={`rounded-base border-2 border-border px-4 py-3 text-base font-bold ${
            notice.tone === "ok" ? "bg-chart-2" : "bg-error"
          } text-main-foreground`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="flex w-full flex-wrap gap-4">
        {rewards.map((reward) => (
          <RewardButton
            key={reward.id}
            groupId={groupId}
            reward={reward}
            points={points}
            onResult={(result) => {
              if (result.ok) {
                setPoints(result.points);
                setNotice({
                  tone: "ok",
                  text: `Sent! Your teacher will review your ${reward.name} request.`,
                });
                void refreshPage();
              } else {
                setNotice({ tone: "error", text: result.error });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

type Result = { ok: true; points: number } | { ok: false; error: string };

function RewardButton({
  groupId,
  reward,
  points,
  onResult,
}: {
  groupId: string;
  reward: StudentReward;
  points: number;
  onResult: (result: Result) => void;
}) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const affordable = points >= reward.cost;
  const short = reward.cost - points;

  if (!affordable) {
    return (
      <Button
        variant="gold"
        disabled
        className="h-auto min-h-[72px] min-w-[180px] flex-col gap-1 whitespace-normal px-4 py-3 text-lg font-bold"
      >
        <span>{reward.name}</span>
        <span className="text-sm font-bold">
          {reward.cost} — need {short} more
        </span>
      </Button>
    );
  }

  const missingResponse = reward.responseRequired && response.trim().length === 0;

  const submit = async () => {
    if (isPending || missingResponse) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await requestReward({
        groupId,
        rewardId: reward.id,
        response: reward.responseRequired ? response : undefined,
      });

      if (result.ok) {
        setOpen(false);
        setResponse("");
      } else {
        setError(result.error);
      }

      onResult(result);
    } catch {
      const message = "That didn't save. Please try again.";
      setError(message);
      onResult({ ok: false, error: message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="gold"
          className="h-auto min-h-[72px] min-w-[180px] flex-col gap-1 whitespace-normal px-4 py-3 text-lg font-bold"
        >
          <span>{reward.name}</span>
          <span className="text-sm font-bold">{reward.cost} kudos</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            Ask for {reward.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            This costs <strong>{reward.cost} kudos</strong>. You have{" "}
            <strong>{points}</strong>, so you&apos;ll have{" "}
            <strong>{points - reward.cost}</strong> left. Your teacher has to say
            yes before you get it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {reward.responseRequired ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`response-${reward.id}`}
              className="text-base font-bold"
            >
              {reward.responsePrompt?.trim() || "Tell your teacher why:"}
            </label>
            <Textarea
              id={`response-${reward.id}`}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={isPending}
              className="text-base"
            />
          </div>
        ) : null}

        {error ? (
          <p
            role="status"
            className="rounded-base border-2 border-border bg-error px-3 py-2 text-base font-bold text-main-foreground"
          >
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="h-12 text-base">
            Never mind
          </AlertDialogCancel>
          {/*
            A plain Button, NOT AlertDialogAction: the Radix action closes the
            dialog on click, which would hide a validation error and throw away
            a half-typed answer.
          */}
          <Button
            type="button"
            variant="green"
            className="h-12 text-base font-bold"
            onClick={() => void submit()}
            disabled={isPending || missingResponse}
          >
            {isPending ? "Sending…" : "Yes, ask for it"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

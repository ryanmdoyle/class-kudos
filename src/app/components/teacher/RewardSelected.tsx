"use client";

import { KudosType } from "@generated/prisma";
import { Button } from "../ui/button";
import { addKudos, getUpdatedEnrollments } from "./functions";
import { EnrollmentWithUser, KudosWithUser, Name } from "@/app/lib/types";
import { PointsPieChart } from "./PointsPieChart"
import { GroupTools } from "./tools/GroupTools";
import { KudosLeaderboard } from "./tools/KudosLeaderboard";
import { toast } from "sonner"
import { useState } from "react";

export function RewardSelected({
  groupId,
  selected,
  setSelected,
  groupKudoTypes,
  setEnrollments,
  kudos,
  names,
  isAwarding,
  setIsAwarding,
}: {
  groupId: string,
  selected: EnrollmentWithUser[],
  setSelected: React.Dispatch<React.SetStateAction<EnrollmentWithUser[]>>,
  groupKudoTypes: KudosType[],
  setEnrollments: React.Dispatch<React.SetStateAction<EnrollmentWithUser[]>>,
  kudos: KudosWithUser[],
  names: Name[]
  isAwarding: boolean,
  setIsAwarding: React.Dispatch<React.SetStateAction<boolean>>,
}) {
  console.log("Render Reward Selected")

  async function handleGiveKudos(kudoType: KudosType) {
    if (!!isAwarding) return; //prevent concurrent awarding
    setIsAwarding(true)

    // Optimistically update points for selected enrollments
    setEnrollments(prevEnrollments =>
      prevEnrollments.map(enrollment =>
        selected.some(sel => sel.id === enrollment.id)
          ? { ...enrollment, points: enrollment.points + kudoType.value }
          : enrollment
      )
    );
    toast.success("Kudos Given!", {
      classNames: {
        toast: "bg-red-500 text-white shadow-lg"
      }
    });
    setSelected([]);

    // Fire off the server update in the background
    await addKudos(kudoType, selected);

    // Fetch the latest enrollments from the server and update state
    const result = await getUpdatedEnrollments(kudoType.groupId);
    if (result.success && result.data) {
      setEnrollments(result.data);
    }
    if (result.error) {
      toast.error("Error Saving Kudos. Try Again.", {
        classNames: {
          toast: "bg-red-500 text-white shadow-lg"
        }
      });
    }
    setIsAwarding(false)
  }

  if (!selected || selected.length === 0) return (
    <div className="center flex-col gap-6 p-4">
      <div className="p-4 bg-background neo-container center">
        <span className="font-bold">
          Select someone to reward them with kudos!
        </span>
      </div>
      {kudos.length > 0 && (
        <div className="flex flex-wrap gap-6">
          <KudosLeaderboard kudos={kudos} />
          <PointsPieChart kudos={kudos} />
          <GroupTools groupId={groupId} names={names} />
        </div>
      )}
    </div>
  );

  if (selected.length === 1) {
    const user = selected[0].user;
    return (
      <div className="p-4 bg-background neo-container">
        <h2 className="text-xl font-bold mb-4">
          Give {user.firstName} {user.lastName} some kudos:
        </h2>
        {/* Reward buttons go here */}
        <div className="flex gap-2 flex-wrap overflow-y-auto">
          {groupKudoTypes && groupKudoTypes.map(kudoType => (
            <Button
              key={kudoType.id}
              variant="gold"
              className="flex items-center justify-between min-w-[120px]"
              onClick={() => handleGiveKudos(kudoType)}
              disabled={!!isAwarding}
            >
              <span className="font-medium">{kudoType.name}</span>
              <span className="text-lg font-bold ml-2">+{kudoType.value}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Multiple selected
  return (
    <div className="p-4 bg-background neo-container grid grid-cols-2 gap-4 overflow-hidden">

      <div className="flex flex-col overflow-hidden">
        <h2 className="text-lg font-semibold mb-2">Selected:</h2>
        <div className="flex-1 overflow-y-auto p-2">

          <ul className="list-disc list-inside">
            {selected.map(sel => (
              <li key={sel.id}>
                {sel.user.firstName} {sel.user.lastName}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 overflow-hidden">
        <h2 className="text-lg font-semibold mb-2">Give kudos to selected:</h2>
        {/* Reward buttons go here */}
        <div className="flex-1 overflow-y-auto p-2 gap-2">
          {groupKudoTypes && groupKudoTypes.map(kudoType => (
            <Button
              key={kudoType.id}
              variant="gold"
              className="flex items-center justify-between min-w-[120px]"
              onClick={() => handleGiveKudos(kudoType)}
            >
              <span className="font-medium">{kudoType.name}</span>
              <span className="text-lg font-bold ml-2">+{kudoType.value}</span>
            </Button>

          ))}
        </div>
      </div>
    </div>
  );
}
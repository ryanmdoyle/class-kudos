"use client";

import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  awardKudos,
  getUpdatedEnrollments,
} from "@/app/components/teacher/functions";
import { PointsPieChart } from "@/app/components/teacher/PointsPieChart";
import { GroupTools } from "@/app/components/teacher/tools/GroupTools";
import { KudosLeaderboard } from "@/app/components/teacher/tools/KudosLeaderboard";
import type { Name } from "@/app/components/teacher/types";
import type { EnrollmentWithUser, KudosWithUser } from "@/app/lib/types";
import type { KudosTypeRow } from "@/db";

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
  groupId: string;
  selected: EnrollmentWithUser[];
  setSelected: React.Dispatch<React.SetStateAction<EnrollmentWithUser[]>>;
  groupKudoTypes: KudosTypeRow[];
  setEnrollments: React.Dispatch<React.SetStateAction<EnrollmentWithUser[]>>;
  kudos: KudosWithUser[];
  names: Name[];
  isAwarding: boolean;
  setIsAwarding: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  /**
   * Award a kudos type to everyone currently selected.
   *
   * Only IDS go over the wire. The server reads the kudos type's name and value
   * from the database and re-filters the enrollment ids by group, so a tampered
   * request cannot award an arbitrary number of points or credit a student in
   * someone else's class.
   *
   * The UI updates optimistically because this is used live in front of a class
   * and a round trip per tap is too slow to be usable; the authoritative roster
   * is then refetched and replaces the optimistic state wholesale.
   */
  async function handleGiveKudos(kudoType: KudosTypeRow) {
    if (isAwarding || selected.length === 0) return;
    setIsAwarding(true);

    const awardedTo = selected;
    const enrollmentIds = awardedTo.map((enrollment) => enrollment.id);

    setEnrollments((previous) =>
      previous.map((enrollment) =>
        enrollmentIds.includes(enrollment.id)
          ? { ...enrollment, points: enrollment.points + kudoType.value }
          : enrollment,
      ),
    );
    setSelected([]);

    const result = await awardKudos(groupId, kudoType.id, enrollmentIds);

    if (!result.success) {
      toast.error(result.error ?? "Error saving kudos. Try again.");
    } else {
      toast.success("Kudos given!");
    }

    // Refetch either way: on failure this rolls the optimistic update back.
    const refreshed = await getUpdatedEnrollments(groupId);
    if (refreshed.success && refreshed.data) {
      setEnrollments(refreshed.data);
    }

    setIsAwarding(false);
  }

  if (selected.length === 0) {
    return (
      <div className="center flex-col gap-6 p-4">
        <div className="p-4 bg-background neo-container center">
          <span className="font-bold">
            Select someone to reward them with kudos!
          </span>
        </div>
        {kudos.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            <KudosLeaderboard kudos={kudos} />
            <PointsPieChart kudos={kudos} />
            <GroupTools groupId={groupId} names={names} />
          </div>
        ) : (
          <GroupTools groupId={groupId} names={names} />
        )}
      </div>
    );
  }

  const kudoButtons = (
    <div className="flex gap-2 flex-wrap overflow-y-auto">
      {groupKudoTypes.map((kudoType) => (
        <Button
          key={kudoType.id}
          variant="gold"
          className="flex items-center justify-between min-w-[120px]"
          onClick={() => handleGiveKudos(kudoType)}
          disabled={isAwarding}
        >
          <span className="font-medium">{kudoType.name}</span>
          <span className="text-lg font-bold ml-2">+{kudoType.value}</span>
        </Button>
      ))}
    </div>
  );

  if (selected.length === 1) {
    const student = selected[0]!.user;
    return (
      <div className="p-4 bg-background neo-container">
        <h2 className="text-xl font-bold mb-4">
          Give {student.firstName} {student.lastName} some kudos:
        </h2>
        {kudoButtons}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background neo-container grid grid-cols-2 gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden">
        <h2 className="text-lg font-semibold mb-2">
          Selected ({selected.length}):
        </h2>
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="list-disc list-inside">
            {selected.map((enrollment) => (
              <li key={enrollment.id}>
                {enrollment.user.firstName} {enrollment.user.lastName}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 overflow-hidden">
        <h2 className="text-lg font-semibold mb-2">Give kudos to selected:</h2>
        <div className="flex-1 overflow-y-auto p-2 gap-2">{kudoButtons}</div>
      </div>
    </div>
  );
}

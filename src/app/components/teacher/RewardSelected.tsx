"use client";

import { KudosType, User } from "@generated/prisma";
import { Button } from "../ui/button";
import { addKudos, getUpdatedEnrollments } from "./functions";
import { EnrollmentWithUser } from "@/app/lib/types";

export function RewardSelected({ selected, groupKudoTypes, setEnrollments }: { selected: EnrollmentWithUser[], groupKudoTypes: KudosType[], setEnrollments: React.Dispatch<React.SetStateAction<EnrollmentWithUser[]>> }) {

  async function handleGiveKudos(kudoType: KudosType) {
    await addKudos(kudoType, selected)
    const result = await getUpdatedEnrollments(kudoType.groupId)
    if (result.success && result.data) {
      setEnrollments(result.data)
    }
  }

  if (!selected || selected.length === 0) return (
    <div className="center">
      <div className="p-4 bg-background neo-container center">
        <h2 className="text-xl font-bold">
          Select someone to reward them with kudos!
        </h2>
      </div>
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
        <div className="flex gap-2">
          {groupKudoTypes && groupKudoTypes.map(kudoType => (
            <Button key={kudoType.id} variant="gold" className="m-1" onClick={() => handleGiveKudos(kudoType)}>{kudoType.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  // Multiple selected
  return (
    <div className="p-4 bg-background neo-container grid grid-cols-2 gap-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Selected:</h2>
        <ul className="list-disc list-inside">
          {selected.map(sel => (
            <li key={sel.id}>
              {sel.user.firstName} {sel.user.lastName}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-start gap-1">
        <h2 className="text-lg font-semibold mb-2">Give kudos to selected:</h2>
        {/* Reward buttons go here */}
        {groupKudoTypes && groupKudoTypes.map(kudoType => (
          <Button key={kudoType.id} variant="gold" className="m-1" onClick={() => handleGiveKudos(kudoType)}>{kudoType.name}</Button>
        ))}
      </div>
    </div>
  );
}
"use client";

import { Group, KudosType } from "@generated/prisma"
import { Button } from "../ui/button";
import { useState, useEffect, useMemo } from "react";
import { RewardSelected } from "./RewardSelected";
import { EnrollmentWithUser, KudosWithUser, Name } from "@/app/lib/types";
import { link } from '@/app/shared/links'
import { GroupHeader } from "./GroupHeader";
import { EnrollmentButton } from "@/app/components/teacher/EnrollmentButton"
import { Toaster } from "sonner"

export function GroupDashboard({ group, initialEnrollments, groupKudoTypes, initialKudos }: { group: Group, initialEnrollments: EnrollmentWithUser[], groupKudoTypes: KudosType[], initialKudos: KudosWithUser[] }) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithUser[]>(initialEnrollments)
  const [selected, setSelected] = useState<EnrollmentWithUser[]>([])
  const [names, setNames] = useState<Name[]>([])
  const [isAwarding, setIsAwarding] = useState<boolean>(false)

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => a.user.firstName.localeCompare(b.user.firstName));
  }, [enrollments]);

  useEffect(() => {
    // Update the selected enrollments to reference the latest versions from the enrollments array
    setSelected((previousSelected) => {
      return previousSelected.map((selectedEnrollment) => {
        const updatedEnrollment = enrollments.find(
          (enrollment) => enrollment.id === selectedEnrollment.id
        )

        // If there's a new version, use it; otherwise, fall back to the old one
        return updatedEnrollment ?? selectedEnrollment
      })
    })

    const names = extractNamesAsObjects(enrollments)
    setNames(names)
  }, [enrollments, setSelected])

  function extractNamesAsObjects(enrolledWithUserArray: EnrollmentWithUser[]) {
    if (!enrolledWithUserArray || enrolledWithUserArray.length === 0) {
      return [];
    }

    return enrolledWithUserArray.map(entry => ({
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      fullName: `${entry.user.firstName} ${entry.user.lastName}`
    }));
  }


  const handleSelect = (enrollment: EnrollmentWithUser) => {
    setSelected(prev =>
      prev.some(e => e.id === enrollment.id)
        ? prev.filter(e => e.id !== enrollment.id)
        : [...prev, enrollment]
    );
  };

  const handleSelectAll = () => {
    setSelected(enrollments);
  };

  const handleClearSelection = () => {
    setSelected([]);
  };

  return (
    <div className="grid grid-cols-4 grid-rows-1 h-full">
      {enrollments.length > 0 && (
        <div className="p-4 bg-green-background border border-border flex flex-col justify-start overflow-auto col-span-1 row-span-1">
          {/* Control buttons */}
          <div className="flex gap-2 mb-2">
            <Button onClick={handleSelectAll} variant="neutral" className="w-full">
              Select All
            </Button>
            {selected.length > 0 && (
              <Button onClick={handleClearSelection} variant="neutral" className="w-full">
                Clear
              </Button>
            )}
          </div>
          {/* Enrollments List */}
          {sortedEnrollments.map(enrollment => (
            <EnrollmentButton
              key={enrollment.id}
              enrollment={enrollment}
              selected={selected}
              handleSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <div className={`bg-green-background overflow-auto ${enrollments.length > 0 ? "col-span-3" : "col-span-4"} row-span-1 border border-border flex flex-col gap-4 items-center justify-center p-6`}>
        <div className="grid grid-rows-[100px_1fr] w-full h-full gap-4">
          {/* Group Name & Points */}
          {group && <GroupHeader group={group} />}

          {/* Selected students & Kudos Buttons */}
          {enrollments.length === 0 ? (
            <div className="center">
              <div className="p-4 bg-background neo-container center flex flex-col max-w-[600px]">
                <h2 className="text-xl font-bold mb-2">
                  Let's get set up!
                </h2>
                <ul className="list-disc pl-5 flex flex-col gap-2">
                  <li>Enroll some students. Have your student create an account, then use the code <strong className="font-code">{group.enrollId}</strong> to add this group.</li>
                  <li className={`${groupKudoTypes.length > 0 ? "line-through" : ""}`}>
                    <a
                      className="text-purple-600"
                      href={link("/teacher/:groupId/options", { groupId: group.id })}
                    >
                      Add types of kudos
                    </a>{" "}
                    to give to your students along with some rewards they can redeem.
                  </li>
                </ul>
              </div>
            </div>

          ) : (
            <RewardSelected groupId={group.id} selected={selected} setSelected={setSelected} groupKudoTypes={groupKudoTypes} setEnrollments={setEnrollments} kudos={initialKudos} names={names} isAwarding={isAwarding} setIsAwarding={setIsAwarding} />
          )}
          <Toaster richColors />
        </div>
      </div>
    </div>
  )
}
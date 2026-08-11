"use client";

import { useEffect, useMemo, useState } from "react";

import { Toaster } from "@/app/components/ui/sonner";
import { Button } from "@/app/components/ui/button";
import { link } from "@/app/shared/links";
import { GroupHeader } from "@/app/components/teacher/GroupHeader";
import { EnrollmentButton } from "@/app/components/teacher/EnrollmentButton";
import { RewardSelected } from "@/app/components/teacher/RewardSelected";
import type { Name } from "@/app/components/teacher/types";
import type { EnrollmentWithUser, KudosWithUser } from "@/app/lib/types";
import type { CodeMode, KudosTypeRow } from "@/db";

export type DashboardGroup = {
  id: string;
  name: string;
  rewardedPoints: number;
  codeMode: CodeMode;
  classCode: string | null;
};

export function GroupDashboard({
  group,
  initialEnrollments,
  groupKudoTypes,
  initialKudos,
}: {
  group: DashboardGroup;
  initialEnrollments: EnrollmentWithUser[];
  groupKudoTypes: KudosTypeRow[];
  initialKudos: KudosWithUser[];
}) {
  const [enrollments, setEnrollments] =
    useState<EnrollmentWithUser[]>(initialEnrollments);
  const [selected, setSelected] = useState<EnrollmentWithUser[]>([]);
  const [isAwarding, setIsAwarding] = useState(false);

  const sortedEnrollments = useMemo(
    () =>
      [...enrollments].sort((a, b) =>
        a.user.firstName.localeCompare(b.user.firstName),
      ),
    [enrollments],
  );

  const names = useMemo<Name[]>(
    () =>
      enrollments.map((enrollment) => ({
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        fullName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      })),
    [enrollments],
  );

  // After an award the roster is refetched, so the objects in `selected` are
  // stale copies. Re-point them at the current rows (matched by enrollment id)
  // so the point totals shown for a still-selected student stay correct.
  useEffect(() => {
    setSelected((previous) =>
      previous.map(
        (selectedEnrollment) =>
          enrollments.find(
            (enrollment) => enrollment.id === selectedEnrollment.id,
          ) ?? selectedEnrollment,
      ),
    );
  }, [enrollments]);

  const handleSelect = (enrollment: EnrollmentWithUser) => {
    setSelected((previous) =>
      previous.some((entry) => entry.id === enrollment.id)
        ? previous.filter((entry) => entry.id !== enrollment.id)
        : [...previous, enrollment],
    );
  };

  const hasStudents = enrollments.length > 0;

  return (
    <div className="grid grid-cols-4 grid-rows-1 h-full">
      {hasStudents ? (
        <div className="p-4 bg-green-background border border-border flex flex-col justify-start overflow-auto col-span-1 row-span-1">
          <div className="flex gap-2 mb-2">
            <Button
              onClick={() => setSelected(enrollments)}
              variant="neutral"
              className="w-full"
            >
              Select All
            </Button>
            {selected.length > 0 ? (
              <Button
                onClick={() => setSelected([])}
                variant="neutral"
                className="w-full"
              >
                Clear
              </Button>
            ) : null}
          </div>

          {sortedEnrollments.map((enrollment) => (
            <EnrollmentButton
              key={enrollment.id}
              enrollment={enrollment}
              selected={selected}
              handleSelect={handleSelect}
            />
          ))}
        </div>
      ) : null}

      <div
        className={`bg-green-background overflow-auto ${
          hasStudents ? "col-span-3" : "col-span-4"
        } row-span-1 border border-border flex flex-col gap-4 items-center justify-center p-6`}
      >
        <div className="grid grid-rows-[100px_1fr] w-full h-full gap-4">
          <GroupHeader
            group={group}
            codeMode={group.codeMode}
            classCode={group.classCode}
          />

          {!hasStudents ? (
            <div className="center">
              <div className="p-4 bg-background neo-container center flex flex-col max-w-[600px]">
                <h2 className="text-xl font-bold mb-2">Let's get set up!</h2>
                <ul className="list-disc pl-5 flex flex-col gap-2">
                  <li>
                    <a
                      className="text-purple-600"
                      href={link("/teacher/:groupId/options", {
                        groupId: group.id,
                      })}
                    >
                      Add your students
                    </a>{" "}
                    — paste your class list, one name per line.
                  </li>
                  <li className={groupKudoTypes.length > 0 ? "line-through" : ""}>
                    <a
                      className="text-purple-600"
                      href={link("/teacher/:groupId/options", {
                        groupId: group.id,
                      })}
                    >
                      Add types of kudos
                    </a>{" "}
                    to give out, along with rewards students can redeem.
                  </li>
                  <li>
                    Give students the class code{" "}
                    {group.classCode ? (
                      <strong className="font-code">{group.classCode}</strong>
                    ) : (
                      "from the Options page"
                    )}{" "}
                    so they can log in.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <RewardSelected
              groupId={group.id}
              selected={selected}
              setSelected={setSelected}
              groupKudoTypes={groupKudoTypes}
              setEnrollments={setEnrollments}
              kudos={initialKudos}
              names={names}
              isAwarding={isAwarding}
              setIsAwarding={setIsAwarding}
            />
          )}
          <Toaster richColors />
        </div>
      </div>
    </div>
  );
}

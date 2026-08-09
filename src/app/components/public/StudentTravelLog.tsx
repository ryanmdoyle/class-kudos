"use client";

import { useState } from "react";

import { TravelButton } from "./TravelButton";
import type { BoardLocation, BoardStudent } from "./types";

/**
 * The classroom board itself: everyone who is here on the left, everyone who is
 * out on the right.
 *
 * State lives here rather than in each tile so that an optimistic move
 * immediately relocates the child between the two columns — the whole point of
 * the board is that a glance answers "who is out of the room?".
 */
export const StudentTravelLog = ({
  students: initialStudents,
  locations,
  groupPublicId,
}: {
  students: BoardStudent[];
  locations: BoardLocation[];
  groupPublicId: string;
}) => {
  const [students, setStudents] = useState(initialStudents);

  const handleLocalUpdate = (
    enrollmentId: string,
    location: BoardLocation | null,
  ) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.enrollmentId === enrollmentId
          ? {
              ...student,
              locationId: location?.id ?? null,
              locationName: location?.name ?? null,
              locationColor: location?.color ?? null,
            }
          : student,
      ),
    );
  };

  const inClass = students.filter((student) => student.locationId === null);
  const outOfClass = students.filter((student) => student.locationId !== null);

  if (students.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="neo-container bg-background p-8 text-center text-lg">
          Nobody is enrolled in this class yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6 p-4 lg:flex-row">
      <section className="flex flex-1 flex-col">
        <h2 className="mb-4 text-2xl font-bold">In Class ({inClass.length})</h2>
        <div className="grid auto-rows-max grid-cols-2 gap-4 pb-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {inClass.map((student) => (
            <TravelButton
              key={student.enrollmentId}
              student={student}
              locations={locations}
              groupPublicId={groupPublicId}
              onLocalUpdate={handleLocalUpdate}
            />
          ))}
        </div>
        {inClass.length === 0 ? (
          <p className="text-base opacity-70">Everybody is out of the room.</p>
        ) : null}
      </section>

      {outOfClass.length > 0 ? (
        <section className="flex w-full flex-col border-border lg:w-72 lg:border-l-2 lg:pl-6">
          <h2 className="mb-4 text-2xl font-bold">
            Out of Class ({outOfClass.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {outOfClass.map((student) => (
              <TravelButton
                key={student.enrollmentId}
                student={student}
                locations={locations}
                groupPublicId={groupPublicId}
                onLocalUpdate={handleLocalUpdate}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

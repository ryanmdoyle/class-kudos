"use client";

import React from "react";

import { Button } from "@/app/components/ui/button";
import type { EnrollmentWithUser } from "@/app/lib/types";

/**
 * One row in the class list. Memoised because a full class re-renders this on
 * every selection change and every optimistic point update.
 */
const EnrollmentButton = React.memo(function EnrollmentButton({
  enrollment,
  selected,
  handleSelect,
}: {
  enrollment: EnrollmentWithUser;
  selected: EnrollmentWithUser[];
  handleSelect: (enrollment: EnrollmentWithUser) => void;
}) {
  const isSelected = selected.some((entry) => entry.id === enrollment.id);

  return (
    <Button
      className={`w-full mb-2 flex justify-between items-center ${
        isSelected ? "bg-main" : ""
      }`}
      variant="neutral"
      aria-pressed={isSelected}
      onClick={() => handleSelect(enrollment)}
    >
      <span>
        {enrollment.user.firstName} {enrollment.user.lastName}
      </span>
      <span>{enrollment.points}</span>
    </Button>
  );
});

export { EnrollmentButton };

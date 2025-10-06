import React from "react";
// Import the EnrollmentWithUser type from its module
import type { EnrollmentWithUser } from "@/app/lib/types"; // Adjust the path as needed
import { Button } from "@/app/components/ui/button";

const EnrollmentButton = React.memo(
  function EnrollmentButton({ enrollment, selected, handleSelect }: {
    enrollment: EnrollmentWithUser,
    selected: EnrollmentWithUser[],
    handleSelect: (enrollment: EnrollmentWithUser) => void
  }) {
    const isSelected = selected.some(e => e.id === enrollment.id);
    return (
      <Button
        className={`w-full mb-2 flex justify-between items-center ${isSelected ? "bg-main" : ""}`}
        variant="neutral"
        key={enrollment.id}
        onClick={() => handleSelect(enrollment)}
      >
        <span>{enrollment.user.firstName} {enrollment.user.lastName}</span>
        <span>{enrollment.points}</span>
      </Button>
    );
  }
);

export { EnrollmentButton }
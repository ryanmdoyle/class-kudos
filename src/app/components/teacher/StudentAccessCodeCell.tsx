"use client";

import { formatCodeForDisplay } from "@/app/lib/codes";
import { StudentAccessCodeButton } from "@/app/components/teacher/StudentAccessCodeButton";
import type { StudentCodeView } from "@/app/components/teacher/types";

/**
 * One student's personal code plus its reset control.
 *
 * In the legacy app this was a server component that queried `accessCode`
 * per row — N queries per page render. The code list now arrives with the page
 * in a single join, so this is a pure display component.
 *
 * `formatCodeForDisplay` comes from `@/app/lib/codes`, which is deliberately
 * database-free and therefore safe to import into a client bundle.
 */
export function StudentAccessCodeCell({
  student,
  onReset,
  disabled = false,
}: {
  student: StudentCodeView;
  onReset: (enrollmentId: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const name = `${student.firstName} ${student.lastName}`.trim();

  return (
    <div className="flex gap-3 justify-end items-center">
      {student.code ? (
        <span className="text-lg font-code tracking-wider">
          {formatCodeForDisplay(student.code)}
        </span>
      ) : (
        <span className="text-sm italic opacity-60">no code yet</span>
      )}
      <StudentAccessCodeButton
        studentName={name}
        hasCode={Boolean(student.code)}
        disabled={disabled}
        onReset={() => onReset(student.enrollmentId)}
      />
    </div>
  );
}

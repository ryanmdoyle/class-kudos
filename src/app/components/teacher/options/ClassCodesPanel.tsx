"use client";

import { useState, useTransition } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { formatCodeForDisplay } from "@/app/lib/codes";
import { StudentAccessCodeCell } from "@/app/components/teacher/StudentAccessCodeCell";
import { CopyCodesButton } from "@/app/components/teacher/options/CopyCodesButton";
import { PrintCodesButton } from "@/app/components/teacher/options/PrintCodesButton";
import { GenerateClassAccessButton } from "@/app/components/teacher/options/GenerateClassAccessButton";
import {
  ensureSharedCode,
  generateStudentCodes,
  regenerateSharedCode,
  resetStudentCode,
  setCodeMode,
  type CodesResult,
} from "@/app/components/teacher/options/functions";
import type { GroupCodesViewModel } from "@/app/components/teacher/types";

/**
 * CLASS CODES — the only door into the app for a student.
 *
 * Two modes, and the teacher picks per group:
 *
 *   shared      one code for the whole class. The student types it, then picks
 *               their name from the roster. Fastest to set up; anyone holding
 *               the code can pick any name in that class.
 *   individual  one code per student, which logs that student straight in.
 *               Requires handing out cards, but a code identifies a person.
 *
 * Switching modes never deletes the other kind of code. `resolveCode()` refuses
 * any code whose kind does not match the group's CURRENT mode, so the switch
 * takes effect instantly and switching back does not force a reprint.
 *
 * Every action returns the WHOLE refreshed view, so one round trip re-renders
 * every row and the panel never drifts from the database. There is no optimistic
 * state here on purpose: showing a code that is not really the stored one is how
 * a teacher ends up printing cards that do not work.
 */
export function ClassCodesPanel({
  groupId,
  groupName,
  initial,
}: {
  groupId: string;
  groupName: string;
  initial: GroupCodesViewModel;
}) {
  const [view, setView] = useState<GroupCodesViewModel>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Every mutation funnels through here: one place to apply state and errors. */
  function run(action: () => Promise<CodesResult>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setView(result.data);
    });
  }

  const missingCount = view.students.filter((student) => !student.code).length;

  return (
    <div className="bg-background w-full neo-container p-6 relative">
      <h2 className="text-2xl font-bold mb-1">Class Codes</h2>
      <p className="text-sm opacity-70 mb-6">
        This is how your students log in. They have no username and no password.
      </p>

      {error ? (
        <p className="text-red-500 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- mode -- */}
      <div className="flex flex-wrap gap-3 mb-6">
        <ModeButton
          active={view.mode === "shared"}
          disabled={pending}
          title="One code for the class"
          subtitle="Student types the code, then picks their name"
          onClick={() => run(() => setCodeMode(groupId, "shared"))}
        />
        <ModeButton
          active={view.mode === "individual"}
          disabled={pending}
          title="A code per student"
          subtitle="The code logs that one student straight in"
          onClick={() => run(() => setCodeMode(groupId, "individual"))}
        />
      </div>

      {/* -------------------------------------------------- shared code -- */}
      {view.mode === "shared" ? (
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
              Class code
            </div>
            <div className="text-5xl font-code tracking-widest">
              {view.groupCode ? formatCodeForDisplay(view.groupCode) : "——————"}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {view.groupCode ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="neutral" className="bg-red-400" disabled={pending}>
                    Regenerate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate the class code?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The current code stops working immediately. Use this if the
                      code has leaked outside your classroom.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => run(() => regenerateSharedCode(groupId))}
                    >
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="green"
                disabled={pending}
                onClick={() => run(() => ensureSharedCode(groupId))}
              >
                Create a class code
              </Button>
            )}

            {view.groupCode ? (
              <Button
                variant="noShadowNeutral"
                disabled={pending}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(formatCodeForDisplay(view.groupCode!))
                    .catch(() => undefined);
                }}
              >
                Copy
              </Button>
            ) : null}
          </div>

          <p className="text-sm opacity-70 max-w-[420px]">
            Put this on the board. Anyone with it can sign in as any student in
            this class — switch to per-student codes if you need a code to
            identify a person.
          </p>
        </div>
      ) : (
        /* ------------------------------------------ individual codes -- */
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <GenerateClassAccessButton
              missingCount={missingCount}
              totalCount={view.students.length}
              disabled={pending}
              onGenerateMissing={() =>
                run(() => generateStudentCodes(groupId, true))
              }
              onRegenerateAll={() =>
                run(() => generateStudentCodes(groupId, false))
              }
            />
            <div className="flex gap-2">
              <CopyCodesButton students={view.students} />
              <PrintCodesButton groupName={groupName} students={view.students} />
            </div>
          </div>

          {view.students.length === 0 ? (
            <p className="text-sm opacity-70">
              No students in this class yet. Add some below and their codes will
              be generated automatically.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead className="text-right pr-6">Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.students.map((student) => (
                  <TableRow key={student.enrollmentId} className="bg-purple-200">
                    <TableCell className="font-base">
                      {student.firstName}
                    </TableCell>
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell className="text-right pr-6">
                      <StudentAccessCodeCell
                        student={student}
                        disabled={pending}
                        onReset={(enrollmentId) =>
                          run(() => resetStudentCode(groupId, enrollmentId))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      aria-pressed={active}
      className={`text-left neo-container p-4 min-w-[260px] border-2 border-border ${
        active ? "bg-green-background" : "bg-secondary-background"
      } ${disabled && !active ? "opacity-60" : ""}`}
    >
      <div className="font-bold">{title}</div>
      <div className="text-sm opacity-70">{subtitle}</div>
    </button>
  );
}

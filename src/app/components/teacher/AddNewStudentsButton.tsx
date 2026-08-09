"use client";

import { useState } from "react";

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
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  createNewStudents,
  type NewStudentInput,
} from "@/app/components/teacher/functions";

/**
 * Paste a class list, one student per line.
 *
 * v2 students have NO username and NO password — the legacy username generator
 * is gone. They are a name plus an enrolment, and they get in with a class code.
 * If the group is in "individual" mode the server issues each new student a code
 * as part of the same action.
 */
export function AddNewStudentsButton({ groupId }: { groupId: string }) {
  const [namesInput, setNamesInput] = useState("");
  const [preview, setPreview] = useState<NewStudentInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function parse(input: string): NewStudentInput[] | null {
    const lines = input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: NewStudentInput[] = [];

    for (const line of lines) {
      // Accept "Last, First" as well as "First Last" — both come off a roster
      // export, and getting it wrong swaps every name in the class.
      if (line.includes(",")) {
        const [last, first] = line.split(",");
        if (!first?.trim() || !last?.trim()) {
          setError(`Invalid name: "${line}". Use "Last, First" or "First Last".`);
          return null;
        }
        parsed.push({ firstName: first.trim(), lastName: last.trim() });
        continue;
      }

      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        setError(`Invalid name: "${line}". Please give a first and last name.`);
        return null;
      }
      const [first, ...rest] = parts;
      parsed.push({ firstName: first, lastName: rest.join(" ") });
    }

    return parsed;
  }

  function handlePreview() {
    setError(null);
    const parsed = parse(namesInput);
    if (parsed) setPreview(parsed);
  }

  const handleSubmit = async () => {
    setError(null);

    // Re-parse rather than relying on the user having pressed Preview.
    const students = preview.length > 0 ? preview : parse(namesInput);
    if (!students || students.length === 0) {
      setError("Add at least one student.");
      return;
    }

    setBusy(true);
    const result = await createNewStudents(groupId, students);
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">
          Add New Students
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add students to this class</AlertDialogTitle>
          <AlertDialogDescription>
            One per line, as “First Last” or “Last, First”. Students have no
            username and no password — they log in with the class code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-4 max-h-[400px]">
          <Textarea
            value={namesInput}
            onChange={(event) => setNamesInput(event.target.value)}
            placeholder={"Ada Lovelace\nHopper, Grace"}
            rows={8}
          />
          {preview.length > 0 ? (
            <div className="border-2 border-border rounded-base p-2 overflow-y-auto min-w-[180px]">
              <h3 className="font-semibold mb-2">
                Preview ({preview.length})
              </h3>
              <ul className="space-y-1">
                {preview.map((student, index) => (
                  <li key={index} className="text-sm">
                    {student.firstName} {student.lastName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {error ? <p className="text-red-500">{error}</p> : null}
        <Button type="button" onClick={handlePreview}>
          Preview
        </Button>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={busy}>
            {busy ? "Adding…" : "Add students"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

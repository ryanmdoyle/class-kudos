"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { formatCodeForDisplay } from "@/app/lib/codes";
import type { StudentCodeView } from "@/app/components/teacher/types";

/**
 * Copy the whole class list as tab-separated text, which pastes straight into a
 * spreadsheet or a mail-merge document as two clean columns.
 *
 * Replaces the legacy CopyUsernamesButton — usernames are no longer a credential
 * (students do not have one at all in v2), so copying them had nothing to offer.
 */
export function CopyCodesButton({ students }: { students: StudentCodeView[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const rows = students
      .filter((student) => student.code)
      .map(
        (student) =>
          `${student.firstName} ${student.lastName}\t${formatCodeForDisplay(
            student.code!,
          )}`,
      );

    const text = ["Student\tCode", ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied outside a secure context or without a user
      // gesture. Nothing useful to recover with, and the print view is the
      // fallback path a teacher actually wants.
    }
  };

  return (
    <Button
      variant="noShadowNeutral"
      size="sm"
      onClick={handleCopy}
      disabled={students.every((student) => !student.code)}
    >
      <Copy />
      {copied ? "Copied" : "Copy list"}
    </Button>
  );
}

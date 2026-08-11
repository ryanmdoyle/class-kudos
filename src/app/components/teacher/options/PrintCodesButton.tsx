"use client";

import { Printer } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { formatCodeForDisplay } from "@/app/lib/codes";
import type { StudentCodeView } from "@/app/components/teacher/types";

/**
 * Print one cut-out card per student.
 *
 * Rendered into a fresh window rather than with a print stylesheet on this page,
 * because the Options page is a dense admin screen and `@media print` rules
 * against it are fragile — one new panel and the printout silently gains a
 * sidebar. A standalone document is the thing being printed, so it is the thing
 * that gets styled.
 *
 * Every interpolated value goes through `escapeHtml`. These are teacher-entered
 * student names being written into a document with `document.write`; without
 * escaping, a name containing markup would execute in that window.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function PrintCodesButton({
  groupName,
  students,
}: {
  groupName: string;
  students: StudentCodeView[];
}) {
  const printable = students.filter((student) => student.code);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) return; // Popup blocked; nothing sensible to fall back to.

    const cards = printable
      .map(
        (student) => `
          <div class="card">
            <div class="name">${escapeHtml(
              `${student.firstName} ${student.lastName}`.trim(),
            )}</div>
            <div class="code">${escapeHtml(
              formatCodeForDisplay(student.code!),
            )}</div>
            <div class="hint">${escapeHtml(groupName)}</div>
          </div>`,
      )
      .join("");

    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Class codes — ${escapeHtml(groupName)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        margin: 24px;
        color: #111;
      }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p.sub { font-size: 12px; color: #555; margin: 0 0 20px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .card {
        border: 2px dashed #999;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .name { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 34px;
        letter-spacing: 4px;
        font-weight: 700;
      }
      .hint { font-size: 11px; color: #666; margin-top: 8px; }
      @media print { body { margin: 12px; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(groupName)} — class codes</h1>
    <p class="sub">Each student types their own code on the login page.</p>
    <div class="grid">${cards}</div>
  </body>
</html>`);

    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Button
      variant="noShadowNeutral"
      size="sm"
      onClick={handlePrint}
      disabled={printable.length === 0}
    >
      <Printer />
      Print cards
    </Button>
  );
}

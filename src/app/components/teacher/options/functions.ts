"use server";

import {
  assertTeacherOwnsGroup,
  ensureGroupCode,
  getGroupCodes,
  issueStudentCode,
  issueStudentCodesForGroup,
  requireTeacher,
  rotateGroupCode,
  setGroupCodeMode,
  type GroupCodesView,
} from "@/auth";
import type { CodeMode } from "@/db";

/**
 * CLASS-CODE MANAGEMENT — the only way a student gets into the app.
 *
 * These are thin, explicit wrappers around `@/auth/classCodes`. That module is
 * NOT a "use server" module (it must not be — it is a library), so this file is
 * the deliberate, hand-written network surface for it. Wrapping rather than
 * re-exporting is the point: it keeps the endpoint list short and reviewable,
 * and it means adding a helper to `@/auth/classCodes` does not silently publish
 * a new endpoint.
 *
 * Every helper in `@/auth/classCodes` already calls `assertTeacherOwnsGroup`,
 * which filters on `ownerId` inside the query and throws 404 (not 403) so group
 * ids stay unenumerable. We still call `requireTeacher()` first here so a
 * STUDENT session is rejected on role before any group lookup happens at all.
 */

export type CodesResult =
  | { success: true; error: null; data: GroupCodesView }
  | { success: false; error: string; data: null };

function fail(error: unknown): CodesResult {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[class codes]", message);
  return { success: false, error: message, data: null };
}

async function currentView(groupId: string): Promise<CodesResult> {
  return { success: true, error: null, data: await getGroupCodes(groupId) };
}

/**
 * Switch between one shared class code and one code per student.
 *
 * `setGroupCodeMode` also back-fills whichever kind of code the new mode needs,
 * so the teacher is never left in a mode with no working codes. Codes of the
 * other kind are kept but stop working immediately, so switching back does not
 * require a reprint.
 */
export async function setCodeMode(
  groupId: string,
  mode: CodeMode,
): Promise<CodesResult> {
  try {
    requireTeacher();

    if (mode !== "shared" && mode !== "individual") {
      throw new Error(`Unknown code mode: ${String(mode)}`);
    }

    await setGroupCodeMode(groupId, mode);
    return await currentView(groupId);
  } catch (error) {
    return fail(error);
  }
}

/** Create the shared code if the group has never had one. */
export async function ensureSharedCode(
  groupId: string,
): Promise<CodesResult> {
  try {
    requireTeacher();
    await assertTeacherOwnsGroup(groupId);
    await ensureGroupCode(groupId);
    return await currentView(groupId);
  } catch (error) {
    return fail(error);
  }
}

/** Replace the shared code. The old one stops working the moment this returns. */
export async function regenerateSharedCode(
  groupId: string,
): Promise<CodesResult> {
  try {
    requireTeacher();
    await rotateGroupCode(groupId);
    return await currentView(groupId);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Bulk-generate per-student codes.
 *
 * `onlyMissing` defaults to true so the common case — "I added three students,
 * give them codes" — does not invalidate the cards the rest of the class is
 * already holding. Passing false is the explicit "reprint everything" path.
 */
export async function generateStudentCodes(
  groupId: string,
  onlyMissing: boolean = true,
): Promise<CodesResult> {
  try {
    requireTeacher();
    await issueStudentCodesForGroup(groupId, { onlyMissing });
    return await currentView(groupId);
  } catch (error) {
    return fail(error);
  }
}

/** Reset ONE student's code (lost card, or a code that got shared around). */
export async function resetStudentCode(
  groupId: string,
  enrollmentId: string,
): Promise<CodesResult> {
  try {
    requireTeacher();
    await issueStudentCode(groupId, enrollmentId);
    return await currentView(groupId);
  } catch (error) {
    return fail(error);
  }
}

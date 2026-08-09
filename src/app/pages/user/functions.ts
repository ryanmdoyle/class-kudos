"use server";

import {
  completeGroupCodeLogin,
  completePasswordReset,
  getPendingGroupRoster,
  loginStudentByCode,
  loginTeacher,
  logoutUser,
  requestPasswordReset,
  type CompletePasswordResetInput,
} from "@/auth";

/**
 * THE AUTH ACTION BOUNDARY — the only "use server" module in the auth system.
 *
 * Every exported function of a "use server" module becomes a network-reachable
 * RSC action addressable by id. That is precisely why `src/auth/**` are plain
 * server-side library modules and why this file exists: it enumerates, BY HAND,
 * the small set of operations an unauthenticated visitor may invoke.
 *
 * Rules for this file — do not relax them:
 *  - NEVER `export * from "@/auth"`. That would publish the guards and the
 *    teacher-side class-code management functions as network endpoints.
 *  - NEVER import `@/auth/provision`. `provisionTeacher` uses the service-role
 *    key and must stay unreachable from the network.
 *  - Wrap; do not re-export bindings. The exported surface must be explicit.
 *
 * These deliberately do NOT call requireUser(): they ARE the pre-authentication
 * surface. EVERY OTHER server action in the app must begin with requireUser() /
 * requireTeacher() / requireStudent() / assertTeacherOwnsGroup(), because
 * redirect middleware is skipped for actions and is therefore not an
 * authorization boundary any more.
 */

/** Teacher login. Supabase verifies the password; we mint our own session. */
export async function teacherLogin(email: string, password: string) {
  return loginTeacher({ email, password });
}

/**
 * Student login — ONE input field. The server decides whether the submitted
 * string is a shared group code or a per-student code.
 *
 * Returns either `{ next: "DASHBOARD" }` (log straight in) or
 * `{ next: "CHOOSE_STUDENT", students }` (show the roster picker).
 */
export async function studentCodeLogin(code: string) {
  return loginStudentByCode(code);
}

/** Step two of the shared-group-code flow. The group comes from the session. */
export async function studentPickName(studentUserId: string) {
  return completeGroupCodeLogin(studentUserId);
}

/** Re-read the pending roster so the picker survives a page refresh. */
export async function loadPendingGroup() {
  return getPendingGroupRoster();
}

export async function logout() {
  return logoutUser();
}

/** Always returns { ok: true } — never an account-existence oracle. */
export async function sendPasswordReset(email: string) {
  return requestPasswordReset(email);
}

export async function finishPasswordReset(input: CompletePasswordResetInput) {
  return completePasswordReset(input);
}

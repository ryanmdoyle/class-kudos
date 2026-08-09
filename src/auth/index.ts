import "server-only";

import { getRequestInfo } from "rwsdk/worker";

import { db, type CodeKind, type CodeMode } from "@/db";
import { nowIso } from "@/lib/sqlite";
import {
  constantTimeEqualString,
  hashCode,
  isWellFormedCode,
  normalizeCode,
} from "@/app/lib/codes";
import { createAnonSupabaseClient, getAppOrigin } from "@/lib/supabase";
import {
  findAuthUserById,
  findAuthUserBySupabaseId,
  loadRawSession,
  rotateSession,
} from "@/auth/context";
import { dashboardPathForRole, isTeacherRole } from "@/auth/types";

export * from "@/auth/types";
export * from "@/auth/context";
export * from "@/auth/classCodes";

/**
 * NOT a "use server" module — see the note in `@/auth/context`.
 *
 * `provisionTeacher` lives in `@/auth/provision` and is intentionally NOT
 * re-exported here, so no barrel import can ever pull the service-role key into
 * a module graph that a "use server" file touches.
 */

/* -------------------------------------------------------------------------- */
/* Generic, non-enumerating failure messages                                   */
/* -------------------------------------------------------------------------- */

/** ONE message for wrong password, unknown email, AND not-provisioned-locally. */
const TEACHER_LOGIN_FAILED =
  "That email and password didn't match. Please try again.";

/** ONE message for malformed, unknown, wrong-mode, archived and empty-roster codes. */
const CODE_LOGIN_FAILED = "That code didn't work. Check it and try again.";

const RESET_LINK_INVALID =
  "That password reset link is invalid or has expired. Please request a new one.";

export const MIN_PASSWORD_LENGTH = 8;

/** Group-code logins must be finished within this window. */
export const PENDING_GROUP_TTL_MS = 10 * 60 * 1000;

export const PASSWORD_RESET_PATH = "/user/reset-password";

/* -------------------------------------------------------------------------- */
/* Teacher login                                                               */
/* -------------------------------------------------------------------------- */

export type TeacherLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Teacher login.
 *
 * Supabase verifies the password and NOTHING ELSE. We take `data.user.id`, find
 * the LOCAL user row by `supabaseUserId`, mint OUR OWN durable session with the
 * LOCAL id, and throw the Supabase JWT away with the client instance. Supabase
 * is never contacted again for the life of that session — every subsequent
 * request is authorized from the durable session plus the local `users` row,
 * exactly like a student's.
 */
export async function loginTeacher({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<TeacherLoginResult> {
  const normalizedEmail = (email ?? "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { ok: false, error: TEACHER_LOGIN_FAILED };
  }

  const supabase = createAnonSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  // Never differentiate. "Invalid login credentials", "Email not confirmed" and
  // rate-limit errors all collapse to the same string.
  if (error || !data?.user) {
    return { ok: false, error: TEACHER_LOGIN_FAILED };
  }

  const user = await findAuthUserBySupabaseId(data.user.id);

  // Authenticated with Supabase but not provisioned for THIS app. Same message:
  // that a Supabase account exists is not something we should confirm.
  if (!user || !isTeacherRole(user.role)) {
    return { ok: false, error: TEACHER_LOGIN_FAILED };
  }

  await rotateSession({ userId: user.id });

  return { ok: true, redirectTo: dashboardPathForRole(user.role) };
}

/* -------------------------------------------------------------------------- */
/* Student login by class code                                                 */
/* -------------------------------------------------------------------------- */

export type ResolvedCode =
  | { kind: "group"; codeId: string; groupId: string; groupName: string }
  | {
      kind: "student";
      codeId: string;
      groupId: string;
      groupName: string;
      userId: string;
    };

/**
 * Resolve a submitted code to whatever it is — the SERVER decides, not the
 * client. There is ONE login input; this is the function behind it.
 *
 * A single indexed equality probe on `classCodes.codeHash` (UNIQUE, so at most
 * one row) plus two key joins resolves either outcome.
 *
 * Returns null for EVERY failure mode so callers cannot leak which one occurred.
 */
export async function resolveCode(
  rawCode: string,
): Promise<ResolvedCode | null> {
  const code = normalizeCode(rawCode);

  if (!isWellFormedCode(code)) {
    return null;
  }

  // Index probe on the digest, never on the plaintext secret.
  const codeHash = await hashCode(code);

  const row = await db
    .selectFrom("classCodes")
    .innerJoin("groups", "groups.id", "classCodes.groupId")
    .leftJoin("enrollments", "enrollments.id", "classCodes.enrollmentId")
    .select([
      "classCodes.id as codeId",
      "classCodes.code as code",
      "classCodes.kind as kind",
      "classCodes.groupId as groupId",
      "groups.name as groupName",
      "groups.archived as archived",
      "groups.codeMode as codeMode",
      "enrollments.userId as userId",
    ])
    .where("classCodes.codeHash", "=", codeHash)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  // The actual secret comparison, in constant time.
  if (!constantTimeEqualString(row.code, code)) {
    return null;
  }

  if (row.archived === 1) {
    return null;
  }

  const kind = row.kind as CodeKind;
  const mode = row.codeMode as CodeMode;

  // A code only works if it matches the group's CURRENT mode. This is how mode
  // switching takes effect: flip the mode and the other kind of printed code
  // stops working immediately, with nothing deleted and nothing to regenerate on
  // the way back. It also means a stale code from the previous mode can never be
  // silently reinterpreted.
  if (kind === "group" && mode !== "shared") return null;
  if (kind === "student" && mode !== "individual") return null;

  if (kind === "student") {
    if (!row.userId) return null;
    return {
      kind: "student",
      codeId: row.codeId,
      groupId: row.groupId,
      groupName: row.groupName,
      userId: row.userId,
    };
  }

  return {
    kind: "group",
    codeId: row.codeId,
    groupId: row.groupId,
    groupName: row.groupName,
  };
}

async function markCodeUsed(codeId: string): Promise<void> {
  await db
    .updateTable("classCodes")
    .set({ lastUsedAt: nowIso() })
    .where("id", "=", codeId)
    .execute();
}

export type RosterStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

export type StudentLoginResult =
  | { ok: true; next: "DASHBOARD"; redirectTo: string }
  | {
      ok: true;
      next: "CHOOSE_STUDENT";
      groupName: string;
      students: RosterStudent[];
    }
  | { ok: false; error: string };

async function listGroupStudents(groupId: string): Promise<RosterStudent[]> {
  return db
    .selectFrom("enrollments")
    .innerJoin("users", "users.id", "enrollments.userId")
    .select([
      "users.id as id",
      "users.firstName as firstName",
      "users.lastName as lastName",
    ])
    .where("enrollments.groupId", "=", groupId)
    .where("users.role", "=", "STUDENT")
    .orderBy("users.firstName", "asc")
    .orderBy("users.lastName", "asc")
    .execute();
}

/**
 * The one and only student login entry point. ONE input field.
 *
 * Per-student code -> straight in.
 * Shared group code -> a short-lived PENDING session holding only the group id,
 * plus the roster to pick from. The pending session means the browser never has
 * to hold on to the class code between the two steps, and step two cannot be
 * called with an arbitrary (group, student) pair.
 */
export async function loginStudentByCode(
  rawCode: string,
): Promise<StudentLoginResult> {
  const match = await resolveCode(rawCode);

  if (!match) {
    return { ok: false, error: CODE_LOGIN_FAILED };
  }

  if (match.kind === "student") {
    const user = await findAuthUserById(match.userId);

    if (!user || user.role !== "STUDENT") {
      return { ok: false, error: CODE_LOGIN_FAILED };
    }

    await markCodeUsed(match.codeId);
    await rotateSession({ userId: user.id });
    return { ok: true, next: "DASHBOARD", redirectTo: "/student" };
  }

  const students = await listGroupStudents(match.groupId);

  if (students.length === 0) {
    return { ok: false, error: CODE_LOGIN_FAILED };
  }

  await markCodeUsed(match.codeId);
  await rotateSession(
    { pendingGroupId: match.groupId },
    { maxAge: PENDING_GROUP_TTL_MS / 1000 },
  );

  return {
    ok: true,
    next: "CHOOSE_STUDENT",
    groupName: match.groupName,
    students,
  };
}

export type PendingGroup = {
  groupId: string;
  groupName: string;
  students: RosterStudent[];
};

/** Re-read the pending group on a page load, so the picker survives a refresh. */
export async function getPendingGroupRoster(): Promise<PendingGroup | null> {
  const session = await loadRawSession();

  if (
    !session?.pendingGroupId ||
    session.userId ||
    Date.now() - session.createdAt > PENDING_GROUP_TTL_MS
  ) {
    return null;
  }

  const group = await db
    .selectFrom("groups")
    .select(["id", "name", "archived", "codeMode"])
    .where("id", "=", session.pendingGroupId)
    .executeTakeFirst();

  if (!group || group.archived === 1 || group.codeMode !== "shared") {
    return null;
  }

  return {
    groupId: group.id,
    groupName: group.name,
    students: await listGroupStudents(group.id),
  };
}

/**
 * Step two of the shared-group-code flow: "pick your name".
 *
 * The group is taken from the PENDING SESSION, never from the client, and the
 * chosen user must be a STUDENT actually enrolled in that group. So the worst a
 * tampered request can do is log in as a different member of a class whose code
 * the visitor already knows — exactly the access the shared code grants by
 * design.
 */
export async function completeGroupCodeLogin(
  studentUserId: string,
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const session = await loadRawSession();

  if (
    !session?.pendingGroupId ||
    Date.now() - session.createdAt > PENDING_GROUP_TTL_MS
  ) {
    return {
      ok: false,
      error: "Your class code timed out. Please enter it again.",
    };
  }

  const groupId = session.pendingGroupId;

  const row = await db
    .selectFrom("enrollments")
    .innerJoin("users", "users.id", "enrollments.userId")
    .innerJoin("groups", "groups.id", "enrollments.groupId")
    .select(["users.id as id", "users.role as role"])
    .where("enrollments.groupId", "=", groupId)
    .where("enrollments.userId", "=", studentUserId)
    .where("groups.archived", "=", 0)
    .where("groups.codeMode", "=", "shared")
    .executeTakeFirst();

  if (!row || row.role !== "STUDENT") {
    return { ok: false, error: CODE_LOGIN_FAILED };
  }

  await rotateSession({ userId: row.id });

  return { ok: true, redirectTo: "/student" };
}

/* -------------------------------------------------------------------------- */
/* Password reset (Supabase's own emails — we have no email provider)          */
/* -------------------------------------------------------------------------- */

/**
 * Ask Supabase to send its own reset email.
 *
 * ALWAYS returns `{ ok: true }`, whatever happened, so this endpoint is not an
 * account-existence oracle. The local pre-check is not for the caller's benefit
 * — it stops our endpoint being used to spray Supabase reset mail at project
 * users who are not teachers of this app.
 */
export async function requestPasswordReset(
  rawEmail: string,
): Promise<{ ok: true }> {
  const email = (rawEmail ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: true };
  }

  const user = await db
    .selectFrom("users")
    .select(["id", "role", "supabaseUserId"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (
    !user ||
    !user.supabaseUserId ||
    (user.role !== "TEACHER" && user.role !== "ADMIN")
  ) {
    return { ok: true };
  }

  const { request } = getRequestInfo();
  const redirectTo = `${getAppOrigin(request)}${PASSWORD_RESET_PATH}`;

  try {
    const supabase = createAnonSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  } catch {
    // Swallowed deliberately: a Supabase outage, a missing key or a rate limit
    // must not become an observable difference between "this email exists" and
    // "it doesn't".
  }

  return { ok: true };
}

/**
 * Two shapes, because Supabase projects emit two different reset link formats:
 *
 *  - `{ tokenHash }`   from `?token_hash=...&type=recovery` (the current
 *                      default). Server-visible, verified with `auth.verifyOtp`.
 *  - `{ accessToken, refreshToken }` from the legacy implicit flow, which puts
 *                      the tokens in the URL **fragment**. A server never sees a
 *                      fragment, so the reset page reads `window.location.hash`
 *                      on the client and posts them to this action.
 */
export type CompletePasswordResetInput =
  | { tokenHash: string; newPassword: string }
  | { accessToken: string; refreshToken: string; newPassword: string };

export type CompletePasswordResetResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function completePasswordReset(
  input: CompletePasswordResetInput,
): Promise<CompletePasswordResetResult> {
  const { newPassword } = input;

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const supabase = createAnonSupabaseClient();

  let supabaseUserId: string;

  if ("tokenHash" in input) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: input.tokenHash,
    });
    if (error || !data?.user) {
      return { ok: false, error: RESET_LINK_INVALID };
    }
    supabaseUserId = data.user.id;
  } else {
    const { data, error } = await supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    if (error || !data?.user) {
      return { ok: false, error: RESET_LINK_INVALID };
    }
    supabaseUserId = data.user.id;
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    // Safe to surface: this is Supabase's own password-policy feedback about a
    // password the caller just typed, not information about another account.
    return { ok: false, error: updateError.message };
  }

  // The recovery token proved control of the mailbox, so minting our session
  // here is legitimate and saves the teacher an immediate second login.
  const user = await findAuthUserBySupabaseId(supabaseUserId);

  if (!user || !isTeacherRole(user.role)) {
    return { ok: true, redirectTo: "/" };
  }

  await rotateSession({ userId: user.id });

  return { ok: true, redirectTo: dashboardPathForRole(user.role) };
}

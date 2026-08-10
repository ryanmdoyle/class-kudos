import "server-only";

import { getRequestInfo } from "rwsdk/worker";

import { db, type CodeKind, type CodeMode } from "@/db";
import { nowIso } from "@/lib/dbValues";
import {
  constantTimeEqualString,
  hashCode,
  isWellFormedCode,
  normalizeCode,
} from "@/app/lib/codes";
import { createAnonSupabaseClient, getAppOrigin } from "@/lib/supabase";
import {
  findAuthUserById,
  loadRawSession,
  rotateSession,
} from "@/auth/context";
import { dashboardPathForRole, isTeacherRole } from "@/auth/types";
import {
  isRateLimited,
  recordAttempt,
  recordFailedAttempt,
  RATE_LIMITED_MESSAGE,
} from "@/auth/rateLimit";
import {
  adoptConfirmedTeacher,
  findUserRowByEmail,
  normalizeEmail,
  normalizeName,
} from "@/auth/localUser";
import { isSupabaseConfigured } from "@/lib/supabase";

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

export const SIGNUP_CONFIRM_PATH = "/user/confirm";

/** State-dependent but account-INdependent, so it is not an existence oracle. */
const SIGNUP_UNAVAILABLE =
  "New accounts can't be created right now. Please try again later.";

const CONFIRM_LINK_INVALID =
  "That confirmation link is invalid, expired, or has already been used.";

/** One message for every conflict in `adoptConfirmedTeacher`. */
const CONFIRM_CONFLICT =
  "We couldn't finish setting up this account. Please contact your administrator.";

/* -------------------------------------------------------------------------- */
/* Teacher login                                                               */
/* -------------------------------------------------------------------------- */

export type TeacherLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Teacher login.
 *
 * Supabase verifies the password and NOTHING ELSE. We take `data.user.id` —
 * which IS `users.id` for a teacher — load that local row, mint OUR OWN durable
 * session from it, and throw the Supabase JWT away with the client instance.
 * Supabase is never contacted again for the life of that session — every
 * subsequent request is authorized from the durable session plus the local
 * `users` row, exactly like a student's.
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

  // Keyed per IP+email so one attacker cannot exhaust an unrelated teacher's
  // budget from the same school IP.
  if (await isRateLimited("teacher-password", normalizedEmail)) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const supabase = createAnonSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  // Never differentiate. "Invalid login credentials", "Email not confirmed" and
  // rate-limit errors all collapse to the same string.
  if (error || !data?.user) {
    await recordFailedAttempt("teacher-password", normalizedEmail);
    return { ok: false, error: TEACHER_LOGIN_FAILED };
  }

  const user = await findAuthUserById(data.user.id);

  // Authenticated with Supabase but not provisioned for THIS app. Same message:
  // that a Supabase account exists is not something we should confirm.
  if (!user || !isTeacherRole(user.role)) {
    await recordFailedAttempt("teacher-password", normalizedEmail);
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

  if (row.archived) {
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
  if (await isRateLimited("student-code")) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const match = await resolveCode(rawCode);

  if (!match) {
    await recordFailedAttempt("student-code");
    return { ok: false, error: CODE_LOGIN_FAILED };
  }

  if (match.kind === "student") {
    const user = await findAuthUserById(match.userId);

    if (!user || user.role !== "STUDENT") {
      await recordFailedAttempt("student-code");
      return { ok: false, error: CODE_LOGIN_FAILED };
    }

    await markCodeUsed(match.codeId);
    await rotateSession({ userId: user.id });
    return { ok: true, next: "DASHBOARD", redirectTo: "/student" };
  }

  const students = await listGroupStudents(match.groupId);

  if (students.length === 0) {
    await recordFailedAttempt("student-code");
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

  if (!group || group.archived || group.codeMode !== "shared") {
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
    .where("groups.archived", "=", false)
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
    .select(["id", "role"])
    .where("email", "=", email)
    .executeTakeFirst();

  // A teacher row can only exist with an auth user behind it — its `id` IS the
  // auth id — so existence is the whole check. There is no longer an
  // "unlinked local row" state to exclude.
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
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

  let authUserId: string;

  if ("tokenHash" in input) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: input.tokenHash,
    });
    if (error || !data?.user) {
      return { ok: false, error: RESET_LINK_INVALID };
    }
    authUserId = data.user.id;
  } else {
    const { data, error } = await supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    if (error || !data?.user) {
      return { ok: false, error: RESET_LINK_INVALID };
    }
    authUserId = data.user.id;
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
  const user = await findAuthUserById(authUserId);

  if (!user || !isTeacherRole(user.role)) {
    return { ok: true, redirectTo: "/" };
  }

  await rotateSession({ userId: user.id });

  return { ok: true, redirectTo: dashboardPathForRole(user.role) };
}

/* -------------------------------------------------------------------------- */
/* Teacher self-signup                                                         */
/* -------------------------------------------------------------------------- */

/**
 * WHY THERE IS NO PASSWORD FIELD HERE.
 *
 * GoTrue's /signup, when the address already exists but is UNCONFIRMED, re-sends
 * the confirmation email and deliberately does NOT update the stored password
 * ("we can't be sure of their claimed identity"). If signup took a password,
 * that enables a pre-hijack: an attacker registers a teacher's address with
 * password A; the real teacher later "signs up" with password B, is confirmed,
 * and never notices B was discarded; the attacker polls until the account
 * confirms and then signs in with A as a TEACHER. Students know their teachers'
 * addresses, so this is a live threat here, not a theoretical one.
 *
 * So: signup proves nothing and creates nothing locally. The password is chosen
 * at the confirmation step by whoever actually controls the mailbox — the same
 * standard `completePasswordReset` already trusts.
 */

/**
 * Cap how long a Supabase auth call may block a user-facing action.
 *
 * `signUp` with "Confirm email" ON does the SMTP send INLINE, so a misconfigured
 * mail provider does not fail fast — it hangs until the provider's own timeout.
 * Observed: 36 seconds, long enough for a gateway to give up first, which
 * presents to the user as a broken app rather than a slow one.
 *
 * The timeout does NOT change what we tell the caller — the response is
 * deliberately generic either way — it just stops a button click hanging. The
 * server-side log is where the real cause lives.
 */
async function withTimeout<T>(
  operation: Promise<T>,
  ms: number,
  label: string,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => {
      console.error(
        `${label}: timed out after ${ms}ms. If email is involved this is almost ` +
          `always SMTP — check the Supabase auth logs.`,
      );
      resolve({ timedOut: true });
    }, ms);
  });

  try {
    return await Promise.race([
      operation.then((value) => ({ timedOut: false as const, value })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export type SignupTeacherInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type SignupTeacherResult = { ok: true } | { ok: false; error: string };

/**
 * A password nobody ever learns. It exists only because /signup requires one;
 * the real password is set at confirmation.
 */
function generatePlaceholderPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let out = "";
  for (const byte of bytes) out += byte.toString(36);
  // Guarantee the character classes any Supabase password policy might demand.
  return `Aa1!${out.slice(0, 40)}`;
}

/**
 * Returns `{ ok: true }` for EVERY outcome that could depend on whether an
 * account exists. `ok: false` is reserved for facts the caller already knows
 * (their own input) or for global unavailability.
 */
export async function signupTeacher(
  input: SignupTeacherInput,
): Promise<SignupTeacherResult> {
  const email = normalizeEmail(input.email);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);

  if (!email.includes("@") || !firstName) {
    return {
      ok: false,
      error: "Please enter your name and a valid email address.",
    };
  }

  if (!isSupabaseConfigured()) {
    console.error("signupTeacher: Supabase is not configured.");
    return { ok: false, error: SIGNUP_UNAVAILABLE };
  }

  if (await isRateLimited("teacher-signup")) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  // Charged UP FRONT, before any Supabase call, so thrown exceptions and
  // abandoned branches still cost budget.
  await recordAttempt("teacher-signup");

  try {
    const { request } = getRequestInfo();
    const supabase = createAnonSupabaseClient();
    const existing = await findUserRowByEmail(email);

    // Already a live local account. `signUp` would be a silent no-op that emails
    // nothing, so send a password-reset link instead: it is truthful, it is the
    // thing they actually need, and it grants nothing the login page's own
    // "forgot password" form doesn't already grant.
    if (existing && existing.role !== "STUDENT") {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getAppOrigin(request)}${PASSWORD_RESET_PATH}`,
        });
      } catch {
        // Swallowed: the response must not vary.
      }
      return { ok: true };
    }

    // A student — or an ADMIN row — owns this address. Do nothing at all, and
    // still say the same thing.
    if (existing && (existing.role === "STUDENT" || existing.role === "ADMIN")) {
      console.warn(`signupTeacher: refusing to touch a ${existing.role} row.`);
      return { ok: true };
    }

    const outcome = await withTimeout(
      supabase.auth.signUp({
        email,
        password: generatePlaceholderPassword(),
        options: {
          emailRedirectTo: `${getAppOrigin(request)}${SIGNUP_CONFIRM_PATH}`,
          data: { first_name: firstName, last_name: lastName },
        },
      }),
      10_000,
      "signupTeacher",
    );

    if (outcome.timedOut) {
      // Generic, like every other outcome. The user is told to check their
      // email; if the send genuinely failed they will simply not receive one,
      // which is the same experience as a wrong address — and the same
      // information, which is the point.
      return { ok: true };
    }

    const { error } = outcome.value;

    if (error) {
      console.error(`signupTeacher: ${error.code ?? "?"} ${error.message}`);

      // Availability, not account existence — safe to distinguish.
      if (
        error.code === "signup_disabled" ||
        error.code === "email_provider_disabled"
      ) {
        return { ok: false, error: SIGNUP_UNAVAILABLE };
      }

      // Everything else — above all "user already registered" — collapses.
      return { ok: true };
    }

    // NOTHING is written locally here. `signUp` on an already-confirmed address
    // returns a FABRICATED random user id; persisting it would permanently
    // orphan the real owner. And a pre-confirmation row would let a stranger
    // squat every teacher address behind the UNIQUE email constraint.
    return { ok: true };
  } catch (cause) {
    // Never let requireSecret()'s message escape — it names env vars.
    console.error("signupTeacher: unexpected failure", cause);
    return { ok: true };
  }
}

export type CompleteTeacherSignupInput = {
  tokenHash: string;
  password: string;
};

export type CompleteTeacherSignupResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; canRequestReset?: boolean };

/**
 * Verify the emailed token, create/link the local row, then set the password.
 *
 * Order matters: the row is written BEFORE the password, so that if the password
 * write fails the account still exists and `requestPasswordReset` can find it.
 */
export async function completeTeacherSignup(
  input: CompleteTeacherSignupInput,
): Promise<CompleteTeacherSignupResult> {
  const { tokenHash, password } = input;

  // Checked before the token is consumed, so a too-short password is resubmittable.
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (!tokenHash) {
    return { ok: false, error: CONFIRM_LINK_INVALID };
  }

  if (await isRateLimited("teacher-confirm")) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const supabase = createAnonSupabaseClient();

  const { data, error } = await supabase.auth.verifyOtp({
    type: "signup",
    token_hash: tokenHash,
  });

  if (error || !data?.user) {
    await recordFailedAttempt("teacher-confirm");
    return { ok: false, error: CONFIRM_LINK_INVALID, canRequestReset: true };
  }

  // The VERIFIED address is authoritative — not anything the form supplied.
  const email = normalizeEmail(data.user.email ?? "");

  if (!email) {
    return { ok: false, error: CONFIRM_LINK_INVALID };
  }

  // user_metadata is attacker-controlled when the account was pre-registered by
  // someone else. Read only these two keys, never `role`, and bound them.
  const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = normalizeName(metadata.first_name, email.split("@")[0] ?? "Teacher");
  const lastName = normalizeName(metadata.last_name);

  const adopted = await adoptConfirmedTeacher({
    authUserId: data.user.id,
    email,
    firstName,
    lastName,
  });

  if (adopted.status === "conflict") {
    console.error(`completeTeacherSignup: conflict (${adopted.reason}) for ${email}`);
    return { ok: false, error: CONFIRM_CONFLICT };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    // Safe to surface: Supabase's own policy feedback about a password the
    // caller just typed. The account exists and is confirmed by now, so the
    // reset link is a genuine way out.
    return { ok: false, error: updateError.message, canRequestReset: true };
  }

  await rotateSession({ userId: adopted.userId });

  return { ok: true, redirectTo: dashboardPathForRole(adopted.role) };
}

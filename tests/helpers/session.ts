import { CookieJar, createClient, type Client } from "./rsc";
import { SEED_TEACHER_EMAIL, SEED_TEACHER_PASSWORD } from "./env";

/**
 * Logging in, for tests whose subject is something else.
 *
 * Everything here POSTs to `"/"`, which is where the browser fires these
 * actions from. `routeToDashboardByRoleOnLogin` — the only route middleware on
 * `/` — opens with `if (isAction) return;`, so an already-authenticated client
 * can still call them. That is what makes the session-fixation test possible.
 */

export type TeacherLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export type StudentLoginResult =
  | { ok: true; next: "DASHBOARD"; redirectTo: string }
  | {
      ok: true;
      next: "CHOOSE_STUDENT";
      groupName: string;
      students: { id: string; firstName: string; lastName: string }[];
    }
  | { ok: false; error: string };

/**
 * Log a teacher in for real, through Supabase `signInWithPassword`.
 *
 * Two budgets apply, and only one is ours:
 *   - our `teacher-password` scope: 10 failures / 5 min per (ip|email), which a
 *     unique CF-Connecting-IP per client keeps private;
 *   - GoTrue's own rate limit, keyed on the caller as GoTrue sees it and
 *     therefore effectively global for a run.
 *
 * Against the local stack the second is not a practical concern. Against a
 * remote project it very much is, and it surfaces as
 * "That email and password didn't match" because the app deliberately collapses
 * every Supabase error into one string. Prefer `teacherClient()`.
 */
export async function loginAsTeacher(
  client: Client = createClient(),
  email: string = SEED_TEACHER_EMAIL,
  password: string = SEED_TEACHER_PASSWORD,
): Promise<Client> {
  const result = await client.action<TeacherLoginResult>(
    "teacherLogin",
    [email, password],
    { path: "/" },
  );

  if (!result.ok) {
    throw new Error(
      `teacherLogin failed: ${result.error}\n` +
        '  "Too many tries…" means a rate-limit budget, not a wrong password.\n' +
        "  Anything else: run `npm run seed` (needs SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  if (!client.jar.sessionId) {
    throw new Error("teacherLogin returned ok but set no session_id cookie.");
  }
  return client;
}

/**
 * A teacher session, minted once per worker process and reused.
 *
 * Each caller gets a fresh client (so a fresh rate-limit IP) sharing the same
 * session cookie. Tests whose subject IS the login flow should call
 * `loginAsTeacher()` directly instead.
 */
let cachedTeacherSession: string | undefined;

export async function teacherClient(): Promise<Client> {
  if (!cachedTeacherSession) {
    const fresh = await loginAsTeacher();
    cachedTeacherSession = fresh.jar.sessionId!;
  }
  const jar = new CookieJar();
  jar.set("session_id", cachedTeacherSession);
  return createClient({ jar });
}

/**
 * Forget the cached session.
 *
 * `logout()` calls this automatically when it logs the cached session out, so you
 * should not normally need it. It stays exported for a test that revokes the
 * session by some other route.
 */
export function resetTeacherSession(): void {
  cachedTeacherSession = undefined;
}

/**
 * Individual-code login: one step, straight to a real session.
 */
export async function loginAsStudentByCode(
  code: string,
  client: Client = createClient(),
): Promise<Client> {
  const result = await client.action<StudentLoginResult>(
    "studentCodeLogin",
    [code],
    { path: "/" },
  );

  if (!result.ok) throw new Error(`studentCodeLogin failed: ${result.error}`);
  if (result.next !== "DASHBOARD") {
    throw new Error(
      `expected next="DASHBOARD", got "${result.next}". That code is a SHARED ` +
        "group code — use loginAsStudentInGroup().",
    );
  }
  if (!client.jar.sessionId) {
    throw new Error("studentCodeLogin returned ok but set no session_id cookie.");
  }
  return client;
}

/**
 * Shared-code login: two steps.
 *
 * Step 1 rotates the session to a PENDING one holding only `pendingGroupId`,
 * with `Max-Age=600` (PENDING_GROUP_TTL_MS / 1000). Step 2 rotates again to the
 * real session.
 *
 * The SAME client must make both calls: the group comes from the pending cookie
 * and is never sent in the request body. That is the whole security property of
 * the two-step flow — a pending session grants the right to list exactly one
 * group's roster and nothing else.
 */
export async function loginAsStudentInGroup(
  sharedCode: string,
  pick: string | ((students: { id: string; firstName: string; lastName: string }[]) => string),
  client: Client = createClient(),
): Promise<Client> {
  const step1 = await client.action<StudentLoginResult>(
    "studentCodeLogin",
    [sharedCode],
    { path: "/" },
  );

  if (!step1.ok) throw new Error(`studentCodeLogin failed: ${step1.error}`);
  if (step1.next !== "CHOOSE_STUDENT") {
    throw new Error(
      `expected next="CHOOSE_STUDENT", got "${step1.next}". That code is a ` +
        "PER-STUDENT code — use loginAsStudentByCode().",
    );
  }
  if (!client.jar.sessionId) {
    throw new Error("no pending session cookie after studentCodeLogin.");
  }

  const userId = typeof pick === "function" ? pick(step1.students) : pick;

  const step2 = await client.action<{ ok: boolean; error?: string }>(
    "studentPickName",
    [userId],
    { path: "/" },
  );
  if (!step2.ok) throw new Error(`studentPickName failed: ${step2.error}`);

  return client;
}

export async function logout(client: Client): Promise<void> {
  /*
   * Captured BEFORE the call, because a successful logout clears the jar.
   *
   * If this client was holding the memoised teacher session, that session is now
   * revoked and every later `teacherClient()` would hand out a dead cookie —
   * turning one logout test into a cascade of confusing 401s in unrelated tests.
   * Enforcing it here rather than relying on each test to remember
   * `resetTeacherSession()` means the obvious way to write such a test
   * (`await logout(await teacherClient())`) is simply correct.
   */
  const sessionBefore = client.jar.sessionId;

  const result = await client.action<{ ok: true; redirectTo: string }>(
    "logout",
    [],
    { path: "/" },
  );
  if (!result.ok) throw new Error("logout did not report ok");
  if (client.jar.sessionId) {
    throw new Error(
      "logout did not clear session_id — the cookie jar must treat Max-Age=0 as a delete.",
    );
  }

  if (sessionBefore !== undefined && sessionBefore === cachedTeacherSession) {
    resetTeacherSession();
  }
}

import { describe, expect, it, onTestFinished } from "vitest";

import { newId } from "@/lib/dbValues";

import { clearLoginAttempts, testDb } from "../helpers/db";
import { SEED_TEACHER_EMAIL, SEED_TEACHER_PASSWORD } from "../helpers/env";
import { withFixture } from "../helpers/fixtures";
import { decodeFlight } from "../helpers/flight";
import {
  decodeSessionCookie,
  forgeMalformedCookie,
  forgeMisSignedCookie,
  forgeUnknownSessionCookie,
} from "../helpers/forgeCookie";
import { CookieJar, createClient, type Client } from "../helpers/rsc";
import { loginAsTeacher } from "../helpers/session";

/**
 * The two login paths, and the cookie they both end in.
 *
 * STACK.md §1 says teacher and student login "share nothing but the session they
 * mint at the end". That makes the session the interesting object: everything
 * here is either about a credential check (and what it refuses to tell you) or
 * about the cookie — that it is minted once, hardened, rotated on every
 * privilege change, revoked on logout, and self-healed when forged.
 *
 * Every client gets its own CF-Connecting-IP, so every rate-limit budget in
 * src/auth/rateLimit.ts is private to one test. Tests that deliberately spend
 * budget clear `loginAttempts` for their own IP afterwards — the table is real
 * and survives the run, so a leaked budget poisons the NEXT run instead.
 */

const TEACHER_LOGIN_FAILED =
  "That email and password didn't match. Please try again.";
const CODE_LOGIN_FAILED = "That code didn't work. Check it and try again.";
const RATE_LIMITED = "Too many tries. Wait a few minutes and try again.";
const PENDING_EXPIRED = "Your class code timed out. Please enter it again.";
const NEEDS_SIGN_IN = "You need to sign in to do that.";

type TeacherLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

type StudentLoginResult =
  | { ok: true; next: "DASHBOARD"; redirectTo: string }
  | {
      ok: true;
      next: "CHOOSE_STUDENT";
      groupName: string;
      students: { id: string; firstName: string; lastName: string }[];
    }
  | { ok: false; error: string };

type PickNameResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Call an action and keep BOTH the decoded result and the raw Response.
 *
 * `client.action()` throws the Response away, and half of this file is
 * assertions about `Set-Cookie` — which is a property of the response, not of
 * the result. Nothing here re-implements the client; it is `rawAction` plus the
 * same `decodeFlight` the client uses.
 */
async function call<T>(
  client: Client,
  name: string,
  args: unknown[] = [],
): Promise<{ response: Response; result: T }> {
  const response = await client.rawAction(name, args, { path: "/" });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/x-component")) {
    throw new Error(
      `${name}: expected a flight response, got HTTP ${response.status} ` +
        `${contentType}\n  body: ${(await response.text()).slice(0, 300)}`,
    );
  }
  const root = await decodeFlight(response.body!);
  return { response, result: root.actionResult as T };
}

/** The one Set-Cookie header a session write is allowed to emit. */
function onlySetCookie(response: Response, label: string): string {
  const cookies = response.headers.getSetCookie();
  /*
   * EXACTLY one, not "at least one". `rotateSession` calls `remove()` and then
   * `save()`, and both do `headers.set("Set-Cookie", …)` — `set` overwrites. If
   * rwsdk ever switched to `append`, the browser would receive the revoking
   * `Max-Age=0` cookie alongside the new one and the outcome would depend on
   * header order. That is worth failing over, loudly, here.
   */
  expect(cookies, `${label}: Set-Cookie headers`).toHaveLength(1);
  return cookies[0]!;
}

describe("teacher login", () => {
  it("mints exactly one hardened session cookie", async () => {
    const client = createClient();

    const { response, result } = await call<TeacherLoginResult>(
      client,
      "teacherLogin",
      [SEED_TEACHER_EMAIL, SEED_TEACHER_PASSWORD],
    );

    expect(result).toEqual({ ok: true, redirectTo: "/teacher" });

    const cookie = onlySetCookie(response, "teacherLogin");
    const attributes = cookie.split(";").map((part) => part.trim());

    expect(attributes[0]!.startsWith("session_id=")).toBe(true);
    expect(attributes.slice(1)).toEqual(["Path=/", "HttpOnly", "SameSite=Lax"]);
    /*
     * NO Max-Age, deliberately. The 14-day cap lives in the Durable Object
     * (`getSession` revokes anything older than MAX_SESSION_DURATION), so the
     * cookie is a session cookie and expiry is decided server-side where it
     * cannot be edited. A Max-Age here would be a second, client-controlled
     * copy of that rule.
     *
     * `Secure` is absent under `vite dev` and present in production — that
     * branch is rwsdk's, keyed on import.meta.env.DEV, so asserting on it here
     * would only pin the dev value.
     */
    expect(cookie).not.toMatch(/max-age/i);

    /* The value is `btoa(uuid + ":" + hmac-sha256-hex)` — a signed opaque id. */
    const parts = decodeSessionCookie(client.jar.sessionId!);
    expect(parts).not.toBeNull();
    expect(parts!.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(parts!.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is not an account-existence oracle", async () => {
    /*
     * A DIFFERENT error for "no such teacher" than for "wrong password" turns
     * this endpoint into a way to enumerate staff addresses — and students know
     * their teachers' addresses (see the signup note in src/auth/index.ts).
     * loginTeacher collapses every failure into one string on purpose, including
     * the case where Supabase authenticates someone who is not a teacher OF THIS
     * APP.
     *
     * Two clients, two IPs: the budget is keyed `ip|email`, and sharing an IP
     * would mean each call spent the other's budget.
     */
    const wrongPassword = createClient();
    const unknownAddress = createClient();
    onTestFinished(async () => {
      await clearLoginAttempts(wrongPassword.ip);
      await clearLoginAttempts(unknownAddress.ip);
    });

    const a = await wrongPassword.action<TeacherLoginResult>(
      "teacherLogin",
      [SEED_TEACHER_EMAIL, "definitely-not-the-password"],
      { path: "/" },
    );
    const b = await unknownAddress.action<TeacherLoginResult>(
      "teacherLogin",
      [`nobody-${newId().slice(0, 8)}@classkudos.local`, "definitely-not-the-password"],
      { path: "/" },
    );

    expect(a).toEqual({ ok: false, error: TEACHER_LOGIN_FAILED });
    expect(b).toEqual({ ok: false, error: TEACHER_LOGIN_FAILED });
    /* The point of the test: identical to each other, character for character. */
    expect((a as { error: string }).error).toBe((b as { error: string }).error);
  });

  it("refuses the 11th attempt for the same email from the same IP", async () => {
    /*
     * `teacher-password` is 10 failures per 5 minutes per (ip|email). The check
     * runs BEFORE the credential is verified, so 10 failures leave 10 rows and
     * the 11th call is refused without ever reaching Supabase.
     *
     * ONE client — one IP — because that is the key. The budget MUST be cleared
     * afterwards: `loginAttempts` is a real table that outlives the process, and
     * a random test IP colliding with a later run would fail it for no reason.
     */
    const client = createClient();
    const email = `throttled-${newId().slice(0, 8)}@classkudos.local`;
    onTestFinished(() => clearLoginAttempts(client.ip));

    for (let attempt = 1; attempt <= 10; attempt++) {
      const result = await client.action<TeacherLoginResult>(
        "teacherLogin",
        [email, "wrong-password"],
        { path: "/" },
      );
      expect(result, `attempt ${attempt}`).toEqual({
        ok: false,
        error: TEACHER_LOGIN_FAILED,
      });
    }

    const eleventh = await client.action<TeacherLoginResult>(
      "teacherLogin",
      [email, "wrong-password"],
      { path: "/" },
    );
    expect(eleventh).toEqual({ ok: false, error: RATE_LIMITED });

    /* Exactly 10 rows: the refused 11th call must not charge budget either. */
    const rows = await testDb()
      .selectFrom("loginAttempts")
      .select(({ fn }) => fn.countAll<string>().as("n"))
      .where("scope", "=", "teacher-password")
      .where("key", "=", `${client.ip}|${email}`)
      .executeTakeFirstOrThrow();
    expect(Number(rows.n)).toBe(10);
  });
});

describe("student login by class code", () => {
  it("returns one group's roster, behind a 10-minute pending cookie", async () => {
    const fixture = await withFixture({ students: 3, label: "auth-shared" });
    const client = createClient();

    const { response, result } = await call<StudentLoginResult>(
      client,
      "studentCodeLogin",
      [fixture.sharedCode],
    );

    expect(result).toEqual({
      ok: true,
      next: "CHOOSE_STUDENT",
      groupName: fixture.groupName,
      /* listGroupStudents orders by firstName then lastName. */
      students: [
        { id: fixture.students[0]!.userId, firstName: "Ada", lastName: "Lovelace" },
        { id: fixture.students[2]!.userId, firstName: "Alan", lastName: "Turing" },
        { id: fixture.students[1]!.userId, firstName: "Grace", lastName: "Hopper" },
      ],
    });

    /*
     * A pending session is not authentication — it is a 10-minute permission to
     * finish one login. `Max-Age=600` is PENDING_GROUP_TTL_MS/1000, and it is
     * belt-and-braces: `completeGroupCodeLogin` re-checks `createdAt` against
     * the same TTL server-side, because a client can always keep a cookie the
     * browser was told to drop.
     */
    const cookie = onlySetCookie(response, "studentCodeLogin");
    expect(cookie).toContain("Max-Age=600");
    expect(client.jar.sessionId).toBeTruthy();
  });

  it("rotates the session when the student picks their name", async () => {
    /*
     * The fixation-safety property. Step 1 mints a cookie for an ANONYMOUS
     * visitor who only proved they know a class code; if step 2 kept that same
     * id, anyone who had planted it (a shared iPad, a link, an XSS write) would
     * be holding a fully authenticated student session afterwards.
     * `rotateSession` mints a new id and revokes the old DO on every call.
     */
    const fixture = await withFixture({ students: 2, label: "auth-rotate" });
    const client = createClient();

    const step1 = await client.action<StudentLoginResult>(
      "studentCodeLogin",
      [fixture.sharedCode],
      { path: "/" },
    );
    expect(step1).toMatchObject({ ok: true, next: "CHOOSE_STUDENT" });
    const pendingCookie = client.jar.sessionId;
    expect(pendingCookie).toBeTruthy();

    const { response, result } = await call<PickNameResult>(
      client,
      "studentPickName",
      [fixture.students[0]!.userId],
    );

    expect(result).toEqual({ ok: true, redirectTo: "/student" });
    onlySetCookie(response, "studentPickName");
    expect(client.jar.sessionId).toBeTruthy();
    expect(client.jar.sessionId).not.toBe(pendingCookie);
  });

  it("refuses studentPickName with no pending session", async () => {
    /*
     * The realistic case is a picker left open past the TTL, or a page refresh
     * after the cookie was dropped. It must say "enter the code again" rather
     * than 500 or leak whether that user id exists — `completeGroupCodeLogin`
     * checks the session BEFORE it ever looks at the argument.
     */
    const client = createClient();

    const result = await client.action<PickNameResult>(
      "studentPickName",
      [newId()],
      { path: "/" },
    );

    expect(result).toEqual({ ok: false, error: PENDING_EXPIRED });
  });

  it("refuses a student from a different group than the pending one", async () => {
    /*
     * THE security property of the two-step flow. The group id comes from the
     * pending session and is never accepted from the client, so knowing class
     * code A must not let you log in as a member of class B — even though the
     * roster query is otherwise identical. Without this, one leaked shared code
     * plus a guessed user id would be a login to any class in the school.
     *
     * The refusal reuses CODE_LOGIN_FAILED, so it also does not distinguish "not
     * in your group" from "no such user".
     */
    const mine = await withFixture({ students: 2, label: "auth-mine" });
    const theirs = await withFixture({ students: 2, label: "auth-theirs" });
    const client = createClient();

    const step1 = await client.action<StudentLoginResult>(
      "studentCodeLogin",
      [mine.sharedCode],
      { path: "/" },
    );
    expect(step1).toMatchObject({ ok: true, next: "CHOOSE_STUDENT" });
    const pendingCookie = client.jar.sessionId;

    const result = await client.action<PickNameResult>(
      "studentPickName",
      [theirs.students[0]!.userId],
      { path: "/" },
    );

    expect(result).toEqual({ ok: false, error: CODE_LOGIN_FAILED });
    /*
     * And the pending session survives, unrotated: a refusal must not cost the
     * child their place in the flow. Proof that it is still usable follows.
     */
    expect(client.jar.sessionId).toBe(pendingCookie);

    const recovered = await client.action<PickNameResult>(
      "studentPickName",
      [mine.students[0]!.userId],
      { path: "/" },
    );
    expect(recovered).toEqual({ ok: true, redirectTo: "/student" });
  });

  it("logs a student straight in from a per-student code", async () => {
    /*
     * The other half of "ONE input field, the SERVER decides what it is": an
     * individual code identifies the student outright, so there is no roster to
     * show and no pending session — one call, one real session. Nothing in the
     * request says which kind of code it is.
     */
    const fixture = await withFixture({
      students: 2,
      codeMode: "individual",
      label: "auth-individual",
    });
    const student = fixture.students[0]!;
    expect(student.code).toBeTruthy();

    const client = createClient();
    const { response, result } = await call<StudentLoginResult>(
      client,
      "studentCodeLogin",
      [student.code],
    );

    expect(result).toEqual({
      ok: true,
      next: "DASHBOARD",
      redirectTo: "/student",
    });

    const cookie = onlySetCookie(response, "studentCodeLogin");
    /* A real session, so no Max-Age — same rule as the teacher's. */
    expect(cookie).not.toMatch(/max-age/i);
    expect(client.jar.sessionId).toBeTruthy();
  });
});

describe("logout", () => {
  it("revokes the session, not just the cookie", async () => {
    /*
     * Clearing the cookie is the easy half and the useless half — anything that
     * captured the value still has it. `logoutUser` calls `sessions.remove`,
     * which deletes the Durable Object's stored session, so the captured cookie
     * is a valid signature over a session that no longer exists.
     *
     * A FRESH login, deliberately not `teacherClient()`: logging out the cached
     * session would revoke it underneath every other test in the run.
     */
    const fixture = await withFixture({ students: 1, label: "auth-logout" });
    const client = await loginAsTeacher();
    const captured = client.jar.sessionId!;

    const { response, result } = await call<{ ok: boolean; redirectTo: string }>(
      client,
      "logout",
    );
    expect(result).toEqual({ ok: true, redirectTo: "/" });

    const cookie = onlySetCookie(response, "logout");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("session_id=;");
    expect(client.jar.sessionId).toBeUndefined();

    /* Replay the captured cookie from a jar that never saw the logout. */
    const replayJar = new CookieJar();
    replayJar.set("session_id", captured);
    const replay = createClient({ jar: replayJar });

    const refused = await replay.action<{
      success: boolean;
      error: string | null;
    }>("getUpdatedEnrollments", [fixture.groupId], { path: "/" });

    /*
     * Channel 3: the teacher module's guards sit INSIDE its try, so the 401
     * ErrorResponse is flattened into a returned result. What matters is that
     * `requireTeacher` refused at all.
     */
    expect(refused).toEqual({ success: false, error: NEEDS_SIGN_IN });
    /* And the dead cookie was cleared on the way out, so the next click is clean. */
    expect(replayJar.sessionId).toBeUndefined();
  });
});

describe("forged and stale cookies self-heal", () => {
  /**
   * `loadAuthContext` catches ErrorResponse(401) from `sessions.load`, clears
   * the cookie and continues ANONYMOUSLY. It must never redirect (an RSC action
   * would receive HTML where it expects a flight payload) and it must never
   * rethrow — a throw here happens before any route, so it would 500 every
   * request made with a stale cookie. STACK.md trap 3 explains why that failure
   * mode is worse than a 403: it is what an expired tab looks like.
   *
   * `loadPendingGroup` is the probe because it is pre-auth and returns `null`
   * for an anonymous caller — so a 200 with `null` is positive evidence that the
   * request completed as an anonymous one.
   */
  async function expectSelfHeal(cookieValue: string, label: string) {
    const jar = new CookieJar();
    jar.set("session_id", cookieValue);
    const client = createClient({ jar });

    const { response, result } = await call<unknown>(client, "loadPendingGroup");

    expect(response.status, label).toBe(200);
    expect(result, label).toBeNull();

    const cookie = onlySetCookie(response, label);
    expect(cookie, label).toContain("Max-Age=0");
    /* The jar honoured the delete, so nothing carries the forgery forward. */
    expect(jar.sessionId, label).toBeUndefined();
  }

  it("treats a mis-signed cookie as anonymous", async () => {
    /* Signature does not verify: the tampering branch. */
    await expectSelfHeal(forgeMisSignedCookie(), "mis-signed");
  });

  it("treats a correctly signed but unknown session as anonymous", async () => {
    /*
     * Signature fine, Durable Object empty — which is EXACTLY what an expired or
     * revoked session looks like on a cold read, and therefore the branch real
     * users hit rather than attackers.
     */
    await expectSelfHeal(forgeUnknownSessionCookie(), "unknown-session");
  });

  it("treats a malformed cookie as anonymous", async () => {
    /* Not even `uuid:signature` once base64-decoded: structural garbage. */
    await expectSelfHeal(forgeMalformedCookie(), "malformed");
  });

  it("still serves the login document with a forged cookie", async () => {
    /*
     * The document path, not the action path. A 500 here would mean an expired
     * tab cannot even reload its way back to a working login page.
     */
    const jar = new CookieJar();
    jar.set("session_id", forgeMisSignedCookie());
    const response = await createClient({ jar }).get("/");

    expect(response.status).toBe(200);
    expect(jar.sessionId).toBeUndefined();
  });
});

describe("rate-limit pruning", () => {
  /**
   * ==========================================================================
   * REGRESSION TEST for a fixed defect — src/auth/rateLimit.ts, isRateLimited()
   *
   * The prune used to be GLOBAL — every scope, every key — while the cutoff was
   * the CURRENT scope's window. The four windows differ by a factor of twelve:
   *
   *   student-code      5 min      teacher-signup     60 min
   *   teacher-password  5 min      teacher-confirm    10 min
   *
   * So any `student-code` check deleted `teacher-signup` rows older than five
   * minutes, even though that budget is meant to hold for an hour. It was not a
   * theoretical hole: `loginStudentByCode` is UNAUTHENTICATED and free to call, so
   * exhausting the eight signups and then failing one class-code login emptied the
   * signup budget — account-creation rate limiting resettable at will by anyone.
   *
   * Fixed by scoping the delete to the scope being read. This test is what stops it
   * coming back; it was originally written to PIN the bug (asserting the rows were
   * gone) and is inverted now that they survive.
   * ==========================================================================
   */
  it("leaves a long budget alone when a short-window scope is checked", async () => {
    const client = createClient();
    onTestFinished(() => clearLoginAttempts(client.ip));

    /*
     * Thirty rows, ten minutes old.
     *
     * Ten minutes is the point of the test: past the 5-minute `student-code`
     * window, well inside the 60-minute `teacher-signup` one.
     *
     * Thirty rather than nine is deliberate margin. Nine only just exceeded the
     * budget of eight, so retuning BUDGETS in either direction — a looser
     * `max: 10`, or a shorter `windowMs` that puts these rows outside the window —
     * would silently un-exhaust the precondition, and the `teacherSignup` call
     * below would stop being blocked and reach Supabase for real.
     *
     * Written directly rather than through the action so the setup does not depend
     * on a Supabase round trip.
     */
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    await testDb()
      .insertInto("loginAttempts")
      .values(
        Array.from({ length: 30 }, () => ({
          id: newId(),
          scope: "teacher-signup",
          key: client.ip,
          createdAt: tenMinutesAgo,
        })),
      )
      .execute();

    /*
     * Confirm the budget really is exhausted. signupTeacher checks the limit
     * before it touches Supabase, so an exhausted call sends no mail and creates
     * nothing — the only reason it is safe to call here at all.
     */
    const blocked = await client.action<{ ok: boolean; error?: string }>(
      "teacherSignup",
      [
        {
          email: `prune-${newId().slice(0, 8)}@classkudos.local`,
          firstName: "Prune",
          lastName: "Probe",
        },
      ],
      { path: "/" },
    );
    expect(blocked).toEqual({ ok: false, error: RATE_LIMITED });

    /*
     * Now touch an UNRELATED short-window budget from the same IP. A bad code is
     * enough: `loginStudentByCode` calls isRateLimited("student-code") first, and
     * the prune happens inside that call.
     */
    const codeLogin = await client.action<StudentLoginResult>(
      "studentCodeLogin",
      ["ZZZZZZ"],
      { path: "/" },
    );
    expect(codeLogin).toEqual({ ok: false, error: CODE_LOGIN_FAILED });

    const surviving = await testDb()
      .selectFrom("loginAttempts")
      .select(({ fn }) => fn.countAll<string>().as("n"))
      .where("scope", "=", "teacher-signup")
      .where("key", "=", client.ip)
      .executeTakeFirstOrThrow();

    /*
     * All thirty survive. The `student-code` prune ran with a 5-minute cutoff, and
     * these rows are ten minutes old — under the old global delete every one of
     * them went, taking the signup budget with them.
     */
    expect(
      Number(surviving.n),
      "a student-code check pruned the teacher-signup budget: an unauthenticated " +
        "endpoint can reset account-creation rate limiting",
    ).toBe(30);

    /*
     * And the budget is still spent, stated as behaviour rather than as rows.
     * Asserted by re-reading the count rather than by calling `teacherSignup`
     * again, because a NON-exhausted signup reaches Supabase and would send real
     * confirmation mail.
     */
    const byScope = await testDb()
      .selectFrom("loginAttempts")
      .select(({ fn }) => [fn.countAll<string>().as("n")])
      .where("key", "=", client.ip)
      .where("scope", "=", "student-code")
      .executeTakeFirstOrThrow();
    /* The failed class-code login charged its own budget, and only its own. */
    expect(Number(byScope.n)).toBe(1);
  });
});

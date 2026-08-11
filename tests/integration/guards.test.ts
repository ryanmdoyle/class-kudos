import { describe, expect, it, onTestFinished } from "vitest";

import { newId, nowIso } from "@/lib/dbValues";

import { pointsOf, countRedeemed, testDb } from "../helpers/db";
import { createForeignTeacher, withFixture } from "../helpers/fixtures";
import { forgeUnknownSessionCookie } from "../helpers/forgeCookie";
import { CookieJar, createClient, expectHttpRefusal } from "../helpers/rsc";
import { loginAsStudentInGroup, teacherClient } from "../helpers/session";

/**
 * THE OBSERVABLE SHAPE OF A REFUSAL.
 *
 * STACK.md trap 3 makes one claim and this file is the test of it: in rwsdk 1.x
 * an RSC action POSTs to the CURRENT page URL, traverses the global middleware
 * chain and that page's route middleware, and only then reaches
 * `handleAction()`. Middleware is therefore NOT an authorization boundary for
 * actions — every action self-guards — and the app has ended up with several
 * *different* ways of saying no.
 *
 * The exhaustive "is every action guarded" sweep lives in authz.test.ts. What is
 * pinned HERE is the channel each refusal travels down, because the channel is
 * what the browser sees and the channel is what silently changes when someone
 * tidies a `try` block or drops an `if (isAction)` branch:
 *
 *   student module  guards OUTSIDE the try -> ErrorResponse escapes -> real HTTP
 *                   401/403/404, text/plain, no flight payload at all
 *   teacher modules guards INSIDE the try  -> `fail(error)` flattens the same
 *                   ErrorResponse into a 200 flight carrying
 *                   { success: false, error: <the ErrorResponse's message> }
 *   middleware      returns a Response -> real HTTP 401/403, and the action
 *                   NEVER RAN
 *   unrouted path   rwsdk 404s, but handleAction() already ran and its result
 *                   was thrown away
 *
 * Every test below therefore asserts on the CHANNEL as well as the answer. A
 * test that only checked "the redemption was refused" would keep passing through
 * every one of the regressions this file exists to catch.
 */

/* -------------------------------------------------------------------------- */

type ActionResult<T = unknown> = {
  success: boolean;
  error: string | null;
  data?: T;
};

type RequestRewardResult =
  | { ok: true; points: number }
  | { ok: false; error: string };

/**
 * A `redeemed` row written directly, never through `requestReward`.
 *
 * cancelRedeemed is the subject of three tests below and it must not depend on
 * the student action that normally creates its input — one bug in requestReward
 * would then fail tests that have nothing to do with it and point at neither.
 */
async function insertRedeemed(input: {
  groupId: string;
  userId: string;
  name: string;
  cost: number;
}): Promise<string> {
  const id = newId();
  await testDb()
    .insertInto("redeemed")
    .values({
      id,
      userId: input.userId,
      groupId: input.groupId,
      name: input.name,
      cost: input.cost,
      response: null,
      reviewed: false,
      reviewedAt: null,
      createdAt: nowIso(),
    })
    .execute();
  return id;
}

async function redeemedExists(id: string): Promise<boolean> {
  const row = await testDb()
    .selectFrom("redeemed")
    .select("id")
    .where("id", "=", id)
    .executeTakeFirst();
  return row !== undefined;
}

/**
 * A group owned by a teacher who is NOT the seeded one, with one student holding
 * `points` and one un-reviewed redemption.
 *
 * The foreign teacher's cleanup is registered BEFORE `withFixture` on purpose.
 * `onTestFinished` callbacks run in reverse registration order, so this puts the
 * group deletion first — and `groups.ownerId references "users"("id") on delete
 * cascade`, meaning dropping the teacher first would take the group with it and
 * leave the fixture's student `users` rows orphaned with nothing left to find
 * them by.
 */
async function foreignGroupWithRedemption(label: string) {
  const foreign = await createForeignTeacher(label);
  onTestFinished(foreign.cleanup);

  const group = await withFixture({
    students: 1,
    points: 10,
    ownerId: foreign.teacherId,
    label,
  });

  const student = group.students[0]!;
  const redeemedId = await insertRedeemed({
    groupId: group.groupId,
    userId: student.userId,
    name: "Sit anywhere",
    cost: 4,
  });

  return { foreign, group, student, redeemedId };
}

/* -------------------------------------------------------------------------- */

describe("the authorization boundary's observable shape", () => {
  /**
   * Channel 1 — the student module's guards sit OUTSIDE its try block.
   *
   * `requestReward` opens with `requireStudent()` then
   * `await assertStudentEnrolled(groupId)`, both before the `try`. So the
   * ErrorResponse(404) escapes the action entirely and rwsdk's top-level catch
   * turns it into a real `new Response(e.message, { status: e.code })` — HTTP
   * 404, text/plain, NO flight payload.
   *
   * Moving those two lines inside the try would convert this hard refusal into a
   * soft `{ ok: false, error }` on a 200, which every existing caller would
   * happily render as an ordinary "sorry, no" message. Nothing else in the suite
   * would notice; this test would.
   *
   * The POST goes to "/" so the 404 has exactly one possible author. "/"'s only
   * route middleware is `routeToDashboardByRoleOnLogin`, which returns early for
   * actions, and "/" deliberately carries no `isAuthenticated` — so nothing
   * between the wire and `assertStudentEnrolled` can produce a 404.
   */
  it("refuses a cross-group requestReward by THROWING 404, not by returning one", async () => {
    const mine = await withFixture({
      students: 2,
      points: 50,
      label: "guards-own",
    });
    const theirs = await withFixture({
      students: 1,
      points: 50,
      rewards: [["Sit anywhere", 5]],
      label: "guards-other",
    });

    const student = await loginAsStudentInGroup(
      mine.sharedCode!,
      mine.students[0]!.userId,
    );

    /*
     * A REAL reward id in a REAL group, and affordable — so the only thing wrong
     * with this call is that the caller is not enrolled. Were the refusal to
     * come from the reward lookup instead of the guard, it would be a 200 with
     * "That reward isn't available any more." and this assertion would fail.
     */
    const error = await expectHttpRefusal(
      student.action<RequestRewardResult>(
        "requestReward",
        [{ groupId: theirs.groupId, rewardId: theirs.rewards[0]!.id }],
        { path: "/" },
      ),
      { status: 404, bodyIncludes: "Not found" },
    );

    /* text/plain, not text/x-component: there is no action result to decode. */
    expect(error.contentType).toContain("text/plain");
    expect(error.body).toBe("Not found");

    /* And nothing was written on the way to being refused. */
    expect(await countRedeemed(theirs.groupId)).toBe(0);
    expect(await pointsOf(theirs.students[0]!.enrollmentId)).toBe(50);
    expect(await pointsOf(mine.students[0]!.enrollmentId)).toBe(50);
  });

  /**
   * Channel 3, and the 404-not-403 rule.
   *
   * `assertTeacherOwnsGroup` puts `ownerId = <current user>` in the WHERE clause
   * and throws **404, not 403**, precisely so a teacher cannot tell "someone
   * else's group" from "no such group" and walk the id space by response code.
   * `cancelRedeemed` then catches that ErrorResponse inside its own try and
   * `fail()` reports `error.message` verbatim — so the exact string on the wire
   * is what the guard chose, and asserting it is asserting the guard's choice.
   *
   * "Forbidden" here would mean someone had "helpfully" made the guard say what
   * it means. That is the enumeration oracle coming back.
   */
  it("reports another teacher's redemption as exactly \"Not found\", never \"Forbidden\"", async () => {
    const { group, student, redeemedId } =
      await foreignGroupWithRedemption("guards-foreign");

    const teacher = await teacherClient();
    const result = await teacher.action<ActionResult>(
      "cancelRedeemed",
      [redeemedId],
      { path: "/" },
    );

    expect(result).toEqual({ success: false, error: "Not found" });
    expect(result.error).not.toBe("Forbidden");

    /* The row is real and still there — the refusal was authorization, not absence. */
    expect(await redeemedExists(redeemedId)).toBe(true);
    expect(await pointsOf(student.enrollmentId)).toBe(10);
    expect(await countRedeemed(group.groupId)).toBe(1);
  });

  /**
   * Channel 2 versus channel 3, on the same underlying "not yours".
   *
   * A student POSTing a teacher action to a /teacher path is stopped by
   * `checkRoleAccess` middleware: HTTP 403, body exactly "Forbidden", and
   * THE ACTION NEVER RUNS. Note `checkRoleAccess` deliberately has no
   * `if (isAction) return;` branch — 403 is the right answer for a document and
   * for an action alike, and letting the action fall through to the page
   * re-render is what hangs the RSC stream (trap 3).
   *
   * Contrast with the test above. Both refusals mean "this is not yours", and
   * they arrive by completely different routes:
   *
   *   foreign group, path "/"        -> 200 flight, { success: false, error: "Not found" }
   *   wrong role, path "/teacher/"   -> 403 text/plain "Forbidden", action never ran
   *
   * The second half of this test fires the identical call at "/" to prove the
   * difference really is the middleware and not the action: there, the student's
   * own `requireTeacher()` inside the try flattens to a 200 flight carrying
   * "Forbidden". Same word, opposite channel.
   *
   * The trailing slash on "/teacher/" is load-bearing: rwsdk's `prefix()`
   * normalises to "/teacher/" and matches with `startsWith`, so a bare
   * "/teacher" would not enter the prefix at all and neither middleware would
   * run.
   */
  it("stops a student's teacher-path action at the middleware with 403 Forbidden", async () => {
    const mine = await withFixture({ students: 1, label: "guards-role" });
    const { redeemedId } = await foreignGroupWithRedemption("guards-role-foreign");

    const student = await loginAsStudentInGroup(
      mine.sharedCode!,
      mine.students[0]!.userId,
    );

    const refusal = await expectHttpRefusal(
      student.action<ActionResult>("cancelRedeemed", [redeemedId], {
        path: "/teacher/",
      }),
      { status: 403 },
    );
    expect(refusal.body).toBe("Forbidden");
    expect(refusal.contentType).toContain("text/plain");

    /* The same call at "/" reaches the action, which refuses it itself. */
    const atRoot = await student.action<ActionResult>(
      "cancelRedeemed",
      [redeemedId],
      { path: "/" },
    );
    expect(atRoot).toEqual({ success: false, error: "Forbidden" });

    /* Neither channel touched the row. */
    expect(await redeemedExists(redeemedId)).toBe(true);
  });

  /**
   * `isAuthenticated`'s `if (isAction)` branch, which is the one thing standing
   * between an expired tab and an HTML redirect in place of an RSC payload.
   *
   * Without that branch the anonymous case returns
   * `302 Location: /` — and a `fetch` for `text/x-component` cannot do anything
   * useful with an HTML redirect. So: 401, and NO Location header. The absence
   * of the header is the actual assertion; the status alone would still pass if
   * someone returned a 401 that also carried a redirect.
   *
   * The second half is the reason the authorization sweep POSTs to "/": the same
   * action, unauthenticated, at "/" also yields 401 — from `requireStudent()`
   * inside the action, since "/" has no `isAuthenticated`. The two 401s are
   * INDISTINGUISHABLE over HTTP (same status, same text/plain, and both bodies
   * are "You need to sign in to do that."), so "/" is the only path where a 401
   * can be attributed to the action's own guard.
   */
  it("401s an anonymous action on /student/ without ever redirecting it", async () => {
    const fixture = await withFixture({
      students: 1,
      points: 7,
      rewards: [["Ask a question", 5]],
      label: "guards-anon",
    });

    const anonymous = createClient();
    expect(anonymous.jar.sessionId).toBeUndefined();

    const response = await anonymous.rawAction(
      "requestReward",
      [{ groupId: fixture.groupId, rewardId: fixture.rewards[0]!.id }],
      { path: "/student/" },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("You need to sign in to do that.");

    /* Same action, same anonymity, at "/" — the action's own requireStudent(). */
    const atRoot = await expectHttpRefusal(
      createClient().action("requestReward", [
        { groupId: fixture.groupId, rewardId: fixture.rewards[0]!.id },
      ]),
      { status: 401 },
    );
    expect(atRoot.body).toBe("You need to sign in to do that.");

    expect(await countRedeemed(fixture.groupId)).toBe(0);
    expect(await pointsOf(fixture.students[0]!.enrollmentId)).toBe(7);
  });

  /**
   * The ~30-second hang, which is the failure mode trap 3 says is worse than a
   * 403 and is reachable in normal use.
   *
   * If the anonymous action were allowed to fall through to the page render, the
   * page's own `requireStudent()` would throw ErrorResponse *inside* the RSC
   * stream; that stream never terminates, and the runtime 500s after roughly 30
   * seconds. Any open tab whose session has expired hits this on the next click.
   *
   * A correctly-signed cookie for a session that was never written is exactly
   * the shape an expired or revoked session takes on a cold Durable Object read:
   * `sessions.load()` throws 401 "Invalid session id", `loadAuthContext`
   * self-heals by clearing the cookie and continuing anonymously, and the route
   * middleware refuses promptly.
   *
   * So the assertion is on the CLOCK as much as the status. 10 seconds is well
   * clear of a healthy response (tens of milliseconds) and well under both the
   * harness's 20s action timeout and the runtime's ~30s hang detector, so
   * neither a slow machine nor a genuine hang can be mistaken for the other.
   */
  it("answers a dead session promptly with 401 instead of hanging the RSC stream", async () => {
    /*
     * Warm the path with a throwaway client first. This is the only test that
     * POSTs to /student/ with a cookie present, and a cold module graph would
     * otherwise put Vite's transform time inside the measurement. It must be a
     * SEPARATE client: the warm-up response clears the forged cookie, which
     * would turn the measured call into the anonymous case above.
     */
    await deadSessionClient().rawAction("setMyLocation", [
      { groupId: newId(), locationId: null },
    ], { path: "/student/" });

    const client = deadSessionClient();
    const forged = client.jar.sessionId;

    const startedAt = performance.now();
    const response = await client.rawAction(
      "setMyLocation",
      [{ groupId: newId(), locationId: null }],
      { path: "/student/" },
    );
    const elapsedMs = performance.now() - startedAt;

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(
      elapsedMs,
      `a dead session took ${elapsedMs.toFixed(0)}ms to be refused — the hang ` +
        "trap 3 describes is back, or the guard now falls through to the page render",
    ).toBeLessThan(10_000);

    /*
     * And the dead cookie was revoked on the way out rather than left to fail
     * identically on every subsequent request.
     */
    expect(forged).toBeTruthy();
    expect(client.jar.sessionId).toBeUndefined();
  });

  /**
   * THE UNROUTED-PATH BYPASS, and why it is safe.
   *
   * `node_modules/rwsdk/dist/runtime/lib/router.js` runs `await handleAction()`
   * *before* returning its `new Response("Not Found", { status: 404 })` — the
   * comment there says "All global middlewares have already executed, so it's
   * safe to handle any pending RSC action". Safe for the action; it also means
   * no ROUTE middleware ran at all, because no route matched. There is no
   * `isAuthenticated` and no `checkRoleAccess` on this request, and the action's
   * return value is discarded with the 404.
   *
   * So this path is reachable, unprotected by middleware, and silent. It is safe
   * for exactly one reason: every action self-guards. That is not a nice
   * property of the framework, it is the claim STACK.md trap 3 makes, and this
   * test is where it is checked.
   *
   * Both halves are needed, and the first is the important one:
   *
   *   own row     -> DELETED and refunded despite the 404. This proves the
   *                  action genuinely executed. Without it, the second half
   *                  would pass just as well if rwsdk had never called the
   *                  action, and would be evidence of nothing.
   *   foreign row -> untouched, because `assertTeacherOwnsGroup` still ran.
   *
   * The two 404 bodies differ, and that difference is worth pinning: the
   * router's is "Not Found", the guard's is "Not found".
   */
  it("runs an action on an unrouted path with no route middleware — and the action's own guard is what holds", async () => {
    const UNROUTED = "/definitely-not-a-route";

    const mine = await withFixture({
      students: 1,
      points: 10,
      label: "guards-unrouted",
    });
    const myStudent = mine.students[0]!;
    const myRedeemedId = await insertRedeemed({
      groupId: mine.groupId,
      userId: myStudent.userId,
      name: "Sit anywhere",
      cost: 3,
    });

    const { student: theirStudent, redeemedId: theirRedeemedId } =
      await foreignGroupWithRedemption("guards-unrouted-foreign");

    const teacher = await teacherClient();

    /* (a) The action really runs: the teacher's own row is cancelled and refunded. */
    const mineResponse = await teacher.rawAction("cancelRedeemed", [myRedeemedId], {
      path: UNROUTED,
    });
    expect(mineResponse.status).toBe(404);
    expect(await mineResponse.text()).toBe("Not Found");

    expect(await redeemedExists(myRedeemedId)).toBe(false);
    expect(await pointsOf(myStudent.enrollmentId)).toBe(13);

    /* (b) And the guard still holds: the other teacher's row survives untouched. */
    const theirsResponse = await teacher.rawAction(
      "cancelRedeemed",
      [theirRedeemedId],
      { path: UNROUTED },
    );
    expect(theirsResponse.status).toBe(404);

    expect(await redeemedExists(theirRedeemedId)).toBe(true);
    expect(await pointsOf(theirStudent.enrollmentId)).toBe(10);

    /*
     * The 404 carries no flight payload, so `action()` cannot report the
     * refusal — the database above is the only witness. Pinned here so nobody
     * later "fixes" a test by switching to action() and gets an opaque failure.
     */
    await expectHttpRefusal(
      teacher.action<ActionResult>("cancelRedeemed", [theirRedeemedId], {
        path: UNROUTED,
      }),
      { status: 404 },
    );
    expect(await redeemedExists(theirRedeemedId)).toBe(true);
  });
});

/**
 * A client carrying a correctly-signed cookie for a session that does not
 * exist. See tests/helpers/forgeCookie.ts: this cannot mint a valid session and
 * must not try — it exercises "signature fine, session absent", which is what an
 * expired or revoked session looks like.
 */
function deadSessionClient() {
  const jar = new CookieJar();
  jar.set("session_id", forgeUnknownSessionCookie());
  return createClient({ jar });
}

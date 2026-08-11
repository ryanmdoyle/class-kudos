import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";

import { closeTestDb, sweepOrphanFixtures } from "../helpers/db";
import { BASE_URL, ORIGIN, REPO_ROOT, TEST_SERVER_MODE } from "../helpers/env";
import { decodeFlight } from "../helpers/flight";

/**
 * Dev-server lifecycle for the integration suite.
 *
 * REUSE IF ONE IS RUNNING; SPAWN OTHERWISE; ONLY KILL WHAT WE SPAWNED.
 *
 * This is not a convenience. Two `vite dev` processes share
 * `.wrangler/state/v3/do/class-kudos-sdk-SessionDurableObject/*.sqlite` and the
 * inspector port — so unconditionally spawning a second one puts two workerd
 * instances on one SQLite file, in the SESSION STORE, which every login test
 * depends on. Corrupting that is the worst possible place for flakiness.
 */

/** Cold `node_modules/.vite` + rwsdk's directive scan + first worker compile. */
const READY_BUDGET_MS = 180_000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The readiness probe: a real action call.
 *
 * `loadPendingGroup` is the ideal choice — no arguments, no database (with no
 * cookie, `getPendingGroupRoster` returns null before touching one), no
 * Supabase, no rate-limit budget, and idempotent. One successful call proves the
 * whole chain at once: server up, directive scan finished, the action lookup
 * table populated, action-id routing correct, our Origin accepted,
 * `x-rsc-data-only` suppressing the page, and the flight decoder working.
 *
 * If this fails you know the HARNESS is broken before a single assertion runs.
 */
export async function warmUp(): Promise<void> {
  const failure = await probe();
  if (failure) {
    throw new Error(`dev server at ${BASE_URL} is not answering actions: ${failure}`);
  }
}

async function probe(): Promise<string | null> {
  const url = new URL("/", BASE_URL);
  url.searchParams.set("__rsc", "");
  url.searchParams.set(
    "__rsc_action_id",
    "/src/app/pages/user/functions.ts#loadPendingGroup",
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        accept: "text/x-component",
        "x-rsc-data-only": "true",
      },
      body: "[]",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    return `no response (${error instanceof Error ? error.message : String(error)})`;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/x-component")) {
    const body = await response.text().catch(() => "");
    return (
      `HTTP ${response.status} ${contentType || "(no content-type)"} — ${body.slice(0, 200)}. ` +
      "Something is listening but it is not this app's action pipeline."
    );
  }

  const root = await decodeFlight(response.body!).catch((error: unknown) => {
    return { node: undefined, actionResult: { __decodeError: String(error) } };
  });

  if (root.actionResult !== null) {
    return `expected actionResult null from loadPendingGroup, got ${JSON.stringify(root.actionResult)}`;
  }
  return null;
}

async function pollUntilReady(budgetMs: number, log: () => string): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let lastFailure = "never attempted";

  while (Date.now() < deadline) {
    const failure = await probe();
    if (!failure) return;
    lastFailure = failure;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `dev server not ready within ${Math.round(budgetMs / 1000)}s.\n` +
      `  last probe failure: ${lastFailure}\n` +
      `--- vite dev output ---\n${log()}`,
  );
}

export default async function setup() {
  /* Sweep fixtures left by a crashed run before anything else touches the DB. */
  try {
    const swept = await sweepOrphanFixtures();
    if (swept.groups > 0) {
      console.log(
        `[test] swept ${swept.groups} orphan fixture group(s) and ${swept.users} student row(s)`,
      );
    }
  } finally {
    /*
     * globalSetup runs in its own module registry from the test workers, so this
     * pool is not the one the tests use. Close it here or the process hangs.
     */
    await closeTestDb();
  }

  if ((await probe()) === null) {
    console.log(`[test] reusing the dev server already running at ${BASE_URL}`);
    return;
  }

  if (TEST_SERVER_MODE === "external") {
    throw new Error(
      `No dev server answering at ${BASE_URL}, and TEST_SERVER=external.\n` +
        "  Start one yourself:  npm run dev -- --port 5173 --strictPort\n" +
        "  (or unset TEST_SERVER to let the suite spawn one).",
    );
  }

  const port = new URL(BASE_URL).port || "5173";
  console.log(`[test] starting a dev server on port ${port}…`);

  /*
   * --strictPort is MANDATORY. Without it vite silently binds 5174 when 5173 is
   * taken, and then every action fails with 403 "Origin not allowed", because
   * the Origin we send no longer matches the server's own origin.
   */
  const child: ChildProcess = spawn(
    "npm",
    ["run", "dev", "--", "--port", port, "--strictPort"],
    {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none", FORCE_COLOR: "0" },
    },
  );

  /* Keep a bounded tail: the real stack trace for a 500 lives here, not in HTTP. */
  let output = "";
  const capture = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-20_000);
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);

  const exitedEarly = once(child, "exit").then(([code]) => {
    throw new Error(
      `dev server exited before becoming ready (code ${code}):\n${output}`,
    );
  });

  try {
    await Promise.race([
      pollUntilReady(READY_BUDGET_MS, () => output),
      exitedEarly,
    ]);
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }

  console.log(`[test] dev server ready at ${BASE_URL}`);

  return async () => {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(10_000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  };
}

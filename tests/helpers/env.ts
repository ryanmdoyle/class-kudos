import { fileURLToPath } from "node:url";

/**
 * Environment for the integration suite, with errors that say what to do.
 *
 * Values arrive via `test.env` in vitest.config.mts, which reads them out of
 * `.env` with Vite's `loadEnv`. `.dev.vars` is a symlink to `.env`, so the
 * harness and the worker read the same bytes — there is no drift to reason
 * about.
 */

export const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const SRC_DIR = fileURLToPath(new URL("../../src", import.meta.url));

/**
 * Where the dev server is expected. Host and port must match EXACTLY: rwsdk
 * rejects any action POST whose `Origin` differs from the server's own origin,
 * and vite silently binds 5174 when 5173 is taken (which is why globalSetup
 * passes `--strictPort`).
 */
export const BASE_URL = (
  process.env.TEST_BASE_URL || "http://localhost:5173"
).replace(/\/+$/, "");

/** The Origin header every action request must carry. Derived, never hardcoded. */
export const ORIGIN = new URL(BASE_URL).origin;

/**
 * Where the harness reads and writes.
 *
 * Falls back to DATABASE_URL, which is normally what you want: the harness and
 * the worker MUST see the same database or every assertion is meaningless.
 * TEST_DATABASE_URL exists for the case where the harness should reach the same
 * database by a different route.
 *
 * NOTE, because it is easy to get backwards: to test the Supavisor transaction
 * pooler, change DATABASE_URL — that is the WORKER's connection path, and the
 * worker is the thing under test. Pointing only TEST_DATABASE_URL at the pooler
 * moves the harness's own connection and proves nothing about the app.
 */
export function databaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No TEST_DATABASE_URL or DATABASE_URL.\n" +
        "  Both are loaded from .env by vitest.config.mts (loadEnv, prefix \"\").\n" +
        "  Bring the local stack up first:\n" +
        "    npm run test:db",
    );
  }
  assertLocalDatabase(url);
  return url;
}

/** Hosts the suite is allowed to destroy data on. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Refuse to run against anything but a local database.
 *
 * ==========================================================================
 * THIS GUARD EXISTS BECAUSE THE FAILURE IS SILENT AND UNRECOVERABLE.
 *
 * The fixtures do not read data, they DESTROY it: every test creates a group with
 * students, spends a balance to zero, races requests at it and deletes the lot.
 * That is correct against the local stack, which `supabase db reset` rebuilds in
 * seconds. Against the online project — a real classroom's roster, points children
 * have earned — it is not a failing test, it is data loss with no undo.
 *
 * And the only thing standing between those two outcomes is which file happened to
 * be copied over `.env`. `npm run env:remote` for one real reset email, forget to
 * switch back, run the suite: gone. So the harness checks rather than trusting.
 *
 * `ALLOW_REMOTE_TEST_DB=1` opts in deliberately, which keeps the documented
 * Supavisor-pooler fidelity check possible (STACK.md §4) without leaving the
 * footgun armed the rest of the time.
 * ==========================================================================
 */
export function assertLocalDatabase(url: string): void {
  if (process.env.ALLOW_REMOTE_TEST_DB === "1") return;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    /*
     * Unparseable: let it through and let `pg` produce the connection error. A
     * malformed URL cannot reach production, so failing here would only obscure a
     * clearer message a moment later.
     */
    return;
  }

  if (LOCAL_HOSTS.has(hostname)) return;

  throw new Error(
    "Refusing to run the test suite against a non-local database.\n\n" +
      `  host: ${hostname}\n\n` +
      "  This suite CREATES AND DESTROYS groups, students and balances. Against a\n" +
      "  real database that is data loss, not a test failure.\n\n" +
      "  If .env is pointed at the online project:\n" +
      "    npm run env:local        # switch back, then re-run\n\n" +
      "  If you genuinely meant a remote database — the Supavisor pooler fidelity\n" +
      "  check is the only good reason — opt in explicitly:\n" +
      "    ALLOW_REMOTE_TEST_DB=1 npm run test:integration\n",
  );
}

/**
 * Only ever set to `"external"`, which makes globalSetup FAIL instead of
 * spawning a dev server — useful when you want to run `npm run dev` yourself and
 * watch its output, since the real stack trace for a 500 lives in that terminal
 * and never in the HTTP response.
 */
export const TEST_SERVER_MODE = process.env.TEST_SERVER ?? "";

export const SEED_TEACHER_EMAIL = "teacher@classkudos.local";
export const SEED_TEACHER_PASSWORD = "changeme-please-8+";

/**
 * Every fixture group name starts with this.
 *
 * It is what makes the orphan sweeper safe: it can only ever match rows this
 * harness created. Every destructive helper in `tests/` must filter on this
 * prefix or on an id it generated itself — never a bare `deleteFrom("groups")`.
 * It also sorts last in a real teacher's group list, so a leaked fixture is
 * visible but not in the way.
 */
export const TEST_PREFIX = "zz-test-";

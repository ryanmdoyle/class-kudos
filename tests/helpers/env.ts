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
        "    supabase start && supabase db reset && npm run seed",
    );
  }
  return url;
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

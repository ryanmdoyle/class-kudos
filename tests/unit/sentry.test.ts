import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { REPO_ROOT } from "../helpers/env";

/**
 * A textual guard on `src/client.tsx`, for the one thing no other test can see.
 *
 * `Sentry.captureException` on an uninitialised SDK is a silent no-op — no client,
 * no DSN, returns an event id, sends nothing. This file previously wired both React
 * error callbacks to Sentry and never called `Sentry.init`, so it reported zero
 * browser errors while reading as fully instrumented. That is the regression this
 * guards, and it is invisible from outside: the browser SDK's state is not
 * observable in the served HTML, so `tests/integration/document.test.ts` can only
 * check that the DSN reaches the page and the CSP permits the ingest host.
 *
 * Asserting on source text is cruder than asserting on behaviour, and it is used
 * here deliberately rather than by default: the alternative is a browser test for
 * one line. The harness already reads source this way to derive the RSC action ids
 * (tests/helpers/actions.ts), so the idiom is not new.
 */
describe("client-side Sentry is initialised, not just imported", () => {
  const source = readFileSync(
    path.join(REPO_ROOT, "src/client.tsx"),
    "utf8",
  );

  it("calls Sentry.init", () => {
    expect(
      source,
      "src/client.tsx captures exceptions but never calls Sentry.init, so every " +
        "browser error is silently discarded",
    ).toMatch(/Sentry\.init\(/);
  });

  it("initialises only when a DSN was injected", () => {
    /*
     * Guarded, so that with no DSN configured the SDK stays off rather than starting
     * with `undefined` and failing somewhere less obvious. The Document omits the
     * injection entirely in that case.
     */
    expect(source).toMatch(/window\.__SENTRY_DSN__/);
    expect(source).toMatch(/if\s*\(\s*dsn\s*\)/);
  });

  it("still reports React errors through both hydration callbacks", () => {
    /*
     * The reason Sentry is in this file at all. If these are dropped, `init` alone
     * reports only unhandled window errors and misses everything React catches.
     */
    expect(source).toMatch(/onUncaughtError/);
    expect(source).toMatch(/onCaughtError/);
    expect(source).toMatch(/Sentry\.captureException\(/);
  });

  it("does not enable tracing or session replay", () => {
    /*
     * Both burn a free-tier quota quickly, and replay records the DOM — which in this
     * app contains children's names. If either is ever wanted, that is a deliberate
     * decision to make explicitly, not a default to drift into.
     */
    expect(source).toMatch(/tracesSampleRate:\s*0/);
    expect(source).not.toMatch(/replaysSessionSampleRate|Sentry\.replayIntegration/);
    expect(source).toMatch(/sendDefaultPii:\s*false/);
  });
});

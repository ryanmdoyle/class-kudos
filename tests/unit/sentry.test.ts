import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { sentryOriginFromDsn } from "@/app/lib/sentry";

import { REPO_ROOT } from "../helpers/env";

/**
 * The CSP origin derivation.
 *
 * This is the piece the integration test cannot pin down. `connect-src` only gains a
 * Sentry origin when a DSN is configured, and local development deliberately has
 * none — so end to end, the interesting branch never runs. Here it runs for every
 * shape of DSN, with no Worker and no secret.
 */
describe("deriving the CSP origin from a DSN", () => {
  it("returns exactly the DSN's own origin", () => {
    expect(
      sentryOriginFromDsn(
        "https://examplekey@o249012.ingest.us.sentry.io/4501234567890",
      ),
    ).toBe("https://o249012.ingest.us.sentry.io");
  });

  it("follows the DSN across regions rather than assuming one", () => {
    /*
     * The reason this is derived and not hardcoded. A CSP host wildcard matches a
     * SUFFIX, so `*.ingest.sentry.io` covers the first of these and NOT the second —
     * a near-miss that reads as correct and silently drops every event.
     */
    expect(sentryOriginFromDsn("https://k@o1.ingest.sentry.io/2")).toBe(
      "https://o1.ingest.sentry.io",
    );
    expect(sentryOriginFromDsn("https://k@o1.ingest.de.sentry.io/2")).toBe(
      "https://o1.ingest.de.sentry.io",
    );
    expect(sentryOriginFromDsn("https://k@sentry.example.school/2")).toBe(
      "https://sentry.example.school",
    );
  });

  it("carries no path, key or project id into the header", () => {
    const origin = sentryOriginFromDsn(
      "https://secretkey@o249012.ingest.us.sentry.io/4501234567890",
    );
    expect(origin).not.toContain("secretkey");
    expect(origin).not.toContain("4501234567890");
    expect(origin).toMatch(/^https:\/\/[^/]+$/);
  });

  it("yields nothing when unconfigured, so the policy does not widen", () => {
    for (const value of [undefined, null, ""]) {
      expect(sentryOriginFromDsn(value)).toBeNull();
    }
  });

  it("refuses a malformed or non-http DSN instead of throwing", () => {
    /*
     * This runs in middleware on every request. A bad secret must not take the site
     * down, and must not put an attacker-chosen token into a security header — so
     * anything unusable resolves to null and reporting simply stays off.
     */
    for (const value of [
      "not a url",
      "o249012.ingest.us.sentry.io",
      "'self' https://evil.example",
      /* No hostname, so these resolve to an opaque origin. */
      "javascript:alert(1)",
      "file:///etc/passwd",
      /*
       * These are the cases the PROTOCOL check exists for, and the reason the
       * hostname check alone is not enough: each parses to a real origin with a real
       * host, so without the scheme guard a malformed secret would land in
       * `connect-src` as a genuinely permitted origin —
       *   connect-src 'self' blob: ws://evil.example
       * Verified: `new URL("ws://evil.example/1").origin` is `"ws://evil.example"`,
       * whereas `javascript:` and `file:` both give `"null"`.
       */
      "ftp://evil.example/1",
      "ws://evil.example/1",
      "wss://evil.example/1",
    ]) {
      expect(sentryOriginFromDsn(value), `should reject: ${value}`).toBeNull();
    }
  });
});

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

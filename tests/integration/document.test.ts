import { describe, expect, it } from "vitest";

import { createClient } from "../helpers/rsc";

/**
 * The HTML shell, and the two things in it that fail SILENTLY.
 *
 * Client-side error reporting needs three separate pieces to line up, none of which
 * complains when it is wrong:
 *
 *   1. `Sentry.init` must actually be called (it was not, for a while — see the
 *      header of src/client.tsx: `captureException` on an uninitialised SDK returns
 *      an event id and sends nothing)
 *   2. the DSN must reach the browser, which it does through this document
 *   3. `connect-src` must allow Sentry's ingest host, or the events are captured and
 *      then refused by the browser
 *
 * Nothing here can verify that events ARRIVE — that needs a real DSN and a real
 * Sentry project. What it can verify is that the plumbing is present and the CSP
 * does not contradict it, which is where all three failure modes live.
 */
describe("the document shell", () => {
  it("serves a nonce'd client script under a nonce-based script-src", async () => {
    const client = createClient();
    const response = await client.get("/");
    expect(response.status).toBe(200);

    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";

    /*
     * An inline script with no nonce is BLOCKED once script-src carries one, which
     * would stop the app hydrating at all — and would take Sentry with it.
     */
    const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? "";
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);

    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(scriptSrc)?.[1];
    expect(nonce).toBeTruthy();

    for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
      /* `src`-less inline scripts are the ones the nonce applies to. */
      if (/\bsrc=/.test(tag)) continue;
      expect(tag, `inline script without the CSP nonce: ${tag}`).toContain(
        `nonce="${nonce}"`,
      );
    }
  });

  it("allows Sentry's ingest host in connect-src", async () => {
    const csp = (await createClient().get("/")).headers.get(
      "content-security-policy",
    );
    const connectSrc = /connect-src ([^;]*)/.exec(csp ?? "")?.[1] ?? "";

    /*
     * A CSP host wildcard matches a SUFFIX, so `*.ingest.sentry.io` does not cover
     * `o123.ingest.us.sentry.io`. Modern DSNs are regional, so both spellings have
     * to be present or reporting silently stops for whichever form the DSN uses.
     */
    expect(connectSrc).toContain("https://*.ingest.sentry.io");
    expect(connectSrc).toContain("https://*.ingest.us.sentry.io");
  });

  it("injects the Sentry DSN only when one is configured", async () => {
    const html = await (await createClient().get("/")).text();
    const match = /window\.__SENTRY_DSN__=([^;]*);/.exec(html);

    if (match) {
      /*
       * Present: it must be a QUOTED string. `JSON.stringify` is what escapes it, and
       * a bare or single-quoted value would mean a malformed secret could break out
       * of the literal and inject script into every page.
       */
      expect(match[1]).toMatch(/^"https:\/\/.+"$/);
    } else {
      /*
       * Absent: the script must be omitted entirely rather than emitted with an
       * `undefined` value, so client.tsx skips `Sentry.init` and nothing is
       * half-configured. This is the local-development path.
       */
      expect(html).not.toContain("__SENTRY_DSN__");
    }
  });
});

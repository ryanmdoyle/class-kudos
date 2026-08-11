import { initClient, initClientNavigation } from "rwsdk/client";
import * as Sentry from "@sentry/browser";

/**
 * The DSN is injected by `src/app/Document.tsx` from the `SENTRY_DSN` secret, and
 * the script is omitted entirely when that secret is unset — so `undefined` here
 * means "error reporting is deliberately off", which is the local-development case.
 */
declare global {
  interface Window {
    __SENTRY_DSN__?: string;
  }
}

/**
 * ==========================================================================
 * `Sentry.init` MUST happen, and it used to be missing.
 *
 * `captureException` on an uninitialised SDK is a silent no-op: there is no
 * client and no DSN, so the call returns an event id and sends nothing. This file
 * previously wired both React error callbacks to Sentry and never called `init`,
 * which reported exactly zero browser errors while looking fully instrumented.
 * That is the failure mode to watch for if anyone refactors this.
 *
 * The other half of it is `connect-src` in `src/app/headers.ts`. The CSP is
 * deliberately tight, and Sentry POSTs events to its ingest host — if that host is
 * not allowed, errors are captured, the request is refused by the browser, and
 * nothing arrives. Both halves are needed; neither fails loudly.
 * ==========================================================================
 */
const dsn = window.__SENTRY_DSN__;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.DEV ? "development" : "production",

    /*
     * Errors only. No performance tracing and no session replay:
     *
     *  - this is a classroom app on school wifi, and the useful signal is "a child
     *    tapped a button and it broke", not span timings
     *  - tracing and replay are the two features that consume a Sentry quota
     *    quickly, and the free tier is the plan this project is on
     *  - replay records the DOM, which here contains children's names
     */
    tracesSampleRate: 0,

    /*
     * No PII from the browser. The server side sets `sendDefaultPii: true` in
     * `src/worker.tsx`, which is a reasonable trade for a Worker (IP and headers
     * help diagnose an edge failure). The browser is different: the DOM around an
     * error in this app contains real children's names, so the default here is to
     * send as little as possible about who hit the error.
     */
    sendDefaultPii: false,
  });
}

// RedwoodSDK uses RSC RPC to emulate client-side navigation.
// https://docs.rwsdk.com/guides/frontend/client-side-nav/
const { handleResponse, onHydrated } = initClientNavigation();

const captureReactError =
  (errorType: "uncaught" | "caught") =>
  (error: unknown, errorInfo: { componentStack?: string }) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { errorType },
    });
  };

initClient({
  handleResponse,
  onHydrated,
  hydrateRootOptions: {
    onUncaughtError: captureReactError("uncaught"),
    onCaughtError: captureReactError("caught"),
  },
});

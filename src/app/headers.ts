import { RouteMiddleware } from "rwsdk/router";
import { IS_DEV } from "rwsdk/constants";

import { sentryOriginFromDsn } from "@/app/lib/sentry";
import { appEnv } from "@/lib/env";

/**
 * The origin Sentry events are POSTed to, derived from the DSN itself.
 *
 * Deriving beats listing. A hardcoded `https://*.ingest.us.sentry.io` works right up
 * until the DSN moves org or region, and then fails silently — errors captured, the
 * request refused by the browser, nothing arriving, indistinguishable from "no errors
 * happened". Reading the secret means the policy is always exactly one origin, always
 * the right one, and when no DSN is configured no Sentry host is permitted at all.
 *
 * The parsing lives in `@/app/lib/sentry` so it can be unit-tested without a Worker;
 * see the header there.
 */
function sentryOrigin(): string | null {
  return sentryOriginFromDsn(appEnv.SENTRY_DSN);
}

export const setCommonHeaders =
  (): RouteMiddleware =>
    ({ response, rw: { nonce } }) => {
      // rwsdk 1.x: `requestInfo.headers` was REMOVED. Every header write —
      // including every session cookie write — goes to `response.headers`.
      const headers = response.headers;

      if (!IS_DEV) {
        // Forces browsers to always use HTTPS for a specified time period (2 years)
        headers.set(
          "Strict-Transport-Security",
          "max-age=63072000; includeSubDomains; preload",
        );
      }

      // Forces browser to use the declared content-type instead of trying to guess/sniff it
      headers.set("X-Content-Type-Options", "nosniff");

      // Stops browsers from sending the referring webpage URL in HTTP headers
      headers.set("Referrer-Policy", "no-referrer");

      // Explicitly disables access to specific browser features/APIs
      headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      );

      // Defines trusted sources for content loading and script execution.
      //
      // `connect-src` gains exactly one extra origin when Sentry is configured —
      // the DSN's own host, derived above rather than hardcoded. See sentryOrigin().
      const connectSrc = ["'self'", "blob:", sentryOrigin()]
        .filter(Boolean)
        .join(" ");

      headers.set(
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://challenges.cloudflare.com; connect-src ${connectSrc}; object-src 'none';`

      );
    };

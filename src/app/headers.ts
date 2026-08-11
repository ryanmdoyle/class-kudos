import { RouteMiddleware } from "rwsdk/router";
import { IS_DEV } from "rwsdk/constants";

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
      // `connect-src` includes Sentry's ingest hosts, and it HAS to: the browser SDK
      // POSTs events there, and without them errors are captured, the request is
      // refused by the browser, and nothing ever arrives — a silent failure that
      // looks identical to "no errors happened". See src/client.tsx.
      //
      // Both spellings are listed because a CSP host wildcard matches a SUFFIX:
      // `*.ingest.sentry.io` does NOT match `o123.ingest.us.sentry.io`, and modern
      // DSNs are regional. Narrow this to your own org host if you prefer:
      //   https://o123456.ingest.us.sentry.io
      headers.set(
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://challenges.cloudflare.com; connect-src 'self' blob: https://*.ingest.sentry.io https://*.ingest.us.sentry.io; object-src 'none';`

      );
    };

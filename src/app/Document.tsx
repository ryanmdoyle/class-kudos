import type { DocumentProps } from "rwsdk/router";

import { appEnv } from "@/lib/env";

import styles from "./styles.css?url";

/**
 * The HTML shell.
 *
 * rwsdk passes the whole `requestInfo` in as props, which is how `rw.nonce` is
 * available here. Every inline script must carry it to satisfy the `script-src`
 * nonce in `setCommonHeaders` — an un-nonced inline script is blocked outright, and
 * for the client entry point that would mean the app never hydrates.
 *
 * `nonce={nonce}` is written explicitly for readability, not out of necessity:
 * React already propagates the nonce to every inline script it renders, and the
 * served HTML is byte-identical without it (verified by removing it and diffing the
 * response). Keeping it makes the CSP requirement visible at the point it applies.
 *
 * ==========================================================================
 * WHY THE SENTRY DSN IS INJECTED HERE
 *
 * The browser SDK cannot start without a DSN, and the DSN lives in a Worker
 * secret the client never sees. Passing it through the document keeps ONE runtime
 * source of truth — the same `SENTRY_DSN` the server side reads — instead of
 * adding a second, build-time copy via a `VITE_` variable. `npm run release`
 * therefore needs no new inputs, and rotating the secret takes effect on the next
 * request rather than the next build.
 *
 * A Sentry DSN is public by design: it authorises SENDING events and nothing
 * else, which is why it is safe in page source. It is still read from a secret
 * rather than hardcoded so that a fork or a preview deploy does not silently
 * report into this project.
 *
 * When `SENTRY_DSN` is unset the script is omitted ENTIRELY rather than emitted
 * as `undefined`, so `src/client.tsx` sees nothing and skips `Sentry.init`. That
 * is the local-development path, and it means no error reporting is configured by
 * accident.
 * ==========================================================================
 */
export const Document: React.FC<DocumentProps> = ({ rw: { nonce }, children }) => {
  const sentryDsn = appEnv.SENTRY_DSN;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Class Kudos</title>
        <link rel="modulepreload" href="/src/client.tsx" />
        <link rel="stylesheet" href={styles} />

        <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body>
        <div id="root">{children}</div>
        {sentryDsn ? (
          /*
           * JSON.stringify, not a template literal: it escapes the value so a
           * malformed or hostile secret cannot break out of the string literal and
           * inject script into every page.
           */
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.__SENTRY_DSN__=${JSON.stringify(sentryDsn)};`,
            }}
          />
        ) : null}
        <script nonce={nonce}>import("/src/client.tsx")</script>
      </body>
    </html>
  );
};

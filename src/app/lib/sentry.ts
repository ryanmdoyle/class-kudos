/**
 * Sentry DSN parsing — a pure primitive, deliberately env-free.
 *
 * Split out of `src/app/headers.ts` so it can be tested directly. That file reads
 * `appEnv`, which reaches `cloudflare:workers` and therefore cannot be imported from
 * a plain-Node test — and the behaviour that matters here (which origin a DSN
 * resolves to) is only observable when a DSN is actually configured, which the local
 * development environment deliberately is not. Keeping the logic pure means it can be
 * exercised for every shape of DSN without a Worker, a server, or a secret.
 *
 * Same reasoning as `src/app/lib/codes.ts`: no database, no env, no request context.
 */

/**
 * The origin the browser SDK POSTs events to, given a DSN.
 *
 * A DSN looks like `https://<key>@o249012.ingest.us.sentry.io/<project>`, and events
 * go to its host — so this is what `connect-src` has to permit. Getting it wrong is
 * SILENT: errors are captured, the browser refuses the request, and nothing arrives.
 *
 * Returns `null` rather than throwing on anything unusable, because the caller runs
 * in middleware on every request and a malformed secret must not take the site down.
 * The consequence of a bad DSN is then only that reporting stays off.
 *
 * Note what this deliberately does NOT do: widen to a wildcard. `*.ingest.sentry.io`
 * would not even match the example above — a CSP host wildcard matches a SUFFIX, and
 * that host ends in `.ingest.us.sentry.io`. Near-misses like that read as correct and
 * drop every event.
 */
export function sentryOriginFromDsn(
  dsn: string | undefined | null,
): string | null {
  if (!dsn) return null;

  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }

  /*
   * Only ever http(s). A DSN with some other scheme is malformed, and echoing it
   * into a Content-Security-Policy would put an attacker-chosen token in a security
   * header — so refuse rather than pass it through.
   */
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname) return null;

  return url.origin;
}

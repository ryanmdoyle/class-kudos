/**
 * "Is this database safe to connect to from a development machine?" — pure, so it
 * can be tested without a Worker.
 *
 * The decision is here; the two inputs it needs (`IS_DEV`, and the
 * `ALLOW_REMOTE_DB` binding) are read by the caller in `@/db`, because both of those
 * only exist inside the Worker runtime and would make this untestable from Node.
 * Same split as `@/app/lib/sentry`: keep the rule pure, pass the context in.
 *
 * This file must never import `@/lib/env`, `@/db`, or anything reaching
 * `cloudflare:workers` — the unit tests import it directly from plain Node.
 */

/** Hosts a development machine is allowed to connect to. */
const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type LocalGuardContext = {
  /** True under `vite dev` and `rw-scripts worker-run`; false in the deployed Worker. */
  isDev: boolean;
  /** The `ALLOW_REMOTE_DB` binding, already compared against `"1"` by the caller. */
  allowRemote: boolean;
};

/**
 * Throw when a development session is pointed at a database it should not touch.
 *
 * ==========================================================================
 * WHY THIS IS WORTH A GUARD RATHER THAN A NOTE IN THE README.
 *
 * Every local consumer of the database resolves the same `db` proxy — `npm run dev`,
 * `npm run seed`, `npm run provision-teacher`, any future script — so one check in
 * `createHandle()` protects all of them, and nothing has to be remembered when a new
 * script is added.
 *
 * What it prevents: one edited line in `.dev.vars` pointing at the live project while
 * you develop against it. `npm run seed` would write demo students into a real
 * classroom's roster; a dev session would mutate balances children earned. Neither
 * announces itself, and neither is undoable.
 *
 * `isDev` is false in production, where a remote database is the only kind there is —
 * this must never fire in the deployed Worker.
 * ==========================================================================
 */
export function assertLocalDatabaseUrl(
  connectionString: string,
  { isDev, allowRemote }: LocalGuardContext,
): void {
  if (!isDev) return;
  if (allowRemote) return;

  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    /* Unparseable: let `pg` produce its own, clearer connection error. */
    return;
  }

  if (LOCAL_DB_HOSTS.has(hostname)) return;

  throw new Error(
    "Refusing to connect to a non-local database in development.\n\n" +
      `  host: ${hostname}\n\n` +
      "  Scripts that write — `npm run seed` especially — would be writing to a\n" +
      "  real database, and that is not undoable.\n\n" +
      "  Point DATABASE_URL in .dev.vars back at 127.0.0.1 (see .env.example), or\n" +
      "  if you genuinely mean it, add this line to .dev.vars:\n" +
      "    ALLOW_REMOTE_DB=1\n\n" +
      "  It has to be in .dev.vars rather than your shell — Worker bindings come\n" +
      "  from that file, not from process env.\n",
  );
}

import { Kysely, PostgresDialect, type Selectable } from "kysely";
import pg from "pg";
import { IS_DEV } from "rwsdk/constants";
import { getRequestInfo } from "rwsdk/worker";

import { assertLocalDatabaseUrl } from "@/db/localGuard";
import { appEnv, requireSecret } from "@/lib/env";
import type {
  AppDatabase,
  ClassCodesTable,
  EnrollmentsTable,
  GroupsTable,
  KudosTable,
  KudosTypesTable,
  LocationHistoryTable,
  LocationsTable,
  LoginAttemptsTable,
  RedeemedTable,
  RewardsTable,
  UsersTable,
} from "@/db/types";

export type { AppDatabase } from "@/db/types";
export { type UserRole, type CodeMode, type CodeKind } from "@/db/types";

/**
 * The one and only database handle. Import it as `import { db } from "@/db"`.
 *
 * Kysely over Supabase Postgres, reached through the Supavisor transaction
 * pooler. Row types come from the hand-written schema in `@/db/types`, which
 * must be kept in step with `supabase/migrations/*.sql`.
 *
 * ==========================================================================
 * `db` IS REQUEST-SCOPED, AND IT HAS TO BE.
 *
 * The Workers runtime binds every I/O object to the request that created it. A
 * socket opened while handling request A throws
 *
 *     Cannot perform I/O on behalf of a different request
 *
 * the moment request B touches it. So there is no module-scope connection here,
 * and there must never be one: `db` is a Proxy that resolves to a pool created
 * lazily, once, per request.
 *
 * This is the SAME RULE as the "never cache the client at module scope" warning
 * in `src/lib/supabase.ts`, but for a DIFFERENT REASON, and the distinction
 * matters if you ever try to optimise one of them. That warning is about
 * GoTrueClient holding a signed-in session in memory — genuinely per-user state,
 * and an account-takeover vector if shared. A Kysely pool holds no identity at
 * all; it is purely the runtime's I/O ownership rule.
 *
 * Consequence worth knowing: each request pays a fresh Postgres connection and
 * TLS handshake. That is the latency cost of this architecture, and the reason
 * Cloudflare Hyperdrive exists. It is a known, accepted trade for now.
 * ==========================================================================
 */

type DbHandle = { db: Kysely<AppDatabase>; pool: pg.Pool };

/**
 * The dev-only "is this database safe?" check.
 *
 * ==========================================================================
 * THIS IS THE ONE PLACE THAT COVERS EVERY LOCAL CONSUMER.
 *
 * `npm run dev`, `npm run seed`, `npm run provision-teacher` and any future script
 * all resolve the same `db` proxy, so they all pass through `createHandle()` below.
 * One check therefore protects all of them, with nothing to remember when a new
 * script appears.
 *
 * The RULE lives in `@/db/localGuard`, deliberately pure so it can be unit-tested
 * from plain Node. Only its two inputs are read here, because both exist solely
 * inside the Worker runtime:
 *
 *   - `IS_DEV` is false in the deployed Worker, where a remote database is the only
 *     kind there is. This must never fire in production.
 *   - `ALLOW_REMOTE_DB` must be set in `.dev.vars`, NOT the shell. That is forced,
 *     not chosen: bindings come from that file, and @cloudflare/vite-plugin does not
 *     forward process env into them (`CLOUDFLARE_INCLUDE_PROCESS_ENV` defaults to
 *     false), so `ALLOW_REMOTE_DB=1 npm run dev` would never reach the Worker.
 *     It works out better — the opt-in sits next to the DATABASE_URL it excuses
 *     instead of vanishing with your shell.
 *
 * Note the asymmetry with the test harness, which has its own equivalent check in
 * `tests/helpers/env.ts` because it opens its own `pg` pool rather than going through
 * this module. Its override IS a shell variable (`ALLOW_REMOTE_TEST_DB=1`), because
 * the harness runs in Node and reads `process.env` directly.
 * ==========================================================================
 */
function createHandle(): DbHandle {
  const connectionString = requireSecret("DATABASE_URL");
  assertLocalDatabaseUrl(connectionString, {
    isDev: IS_DEV,
    allowRemote: appEnv.ALLOW_REMOTE_DB === "1",
  });

  const pool = new pg.Pool({
    connectionString,
    // Supavisor is doing the real pooling; a single Worker request needs
    // exactly one connection.
    max: 1,
  });

  return {
    pool,
    db: new Kysely<AppDatabase>({ dialect: new PostgresDialect({ pool }) }),
  };
}

/**
 * Per-request handles, keyed by the Request object itself so nothing can leak
 * between requests and entries are collected with the request.
 */
const handles = new WeakMap<Request, DbHandle>();

/**
 * Set for the duration of a `withDb(...)` call, and only then.
 *
 * Scripts run through `rw-scripts worker-run`, which reaches the worker's fetch
 * but NOT rwsdk's routed request pipeline, so `getRequestInfo()` throws and
 * there is no per-request slot to hang a handle on. Rather than thread an
 * executor argument through every function a script touches, `withDb` publishes
 * one here so the ambient `db` resolves normally.
 *
 * This is safe precisely because it is scoped: it is set on entry, cleared in a
 * `finally`, and a real Worker request never takes this path (rwsdk always
 * populates request info for routed traffic). A module-scope handle that
 * OUTLIVED its scope would be the bug this whole file exists to prevent.
 */
let scriptHandle: DbHandle | null = null;

/** The handle for the request currently in flight, created on first use. */
function requestHandle(): DbHandle {
  let info: ReturnType<typeof getRequestInfo>;

  try {
    info = getRequestInfo();
  } catch {
    if (scriptHandle) return scriptHandle;

    throw new Error(
      "`db` was used outside a request. The Workers runtime ties sockets to the " +
        "request that opened them, so there is no ambient connection.\n" +
        "  In a script (rw-scripts worker-run), wrap the work in " +
        "`withDb(async () => …)` from @/db.",
    );
  }

  const existing = handles.get(info.request);
  if (existing) return existing;

  const handle = createHandle();
  handles.set(info.request, handle);
  return handle;
}

/**
 * Close the connection opened for this request, if any.
 *
 * Called from the worker's fetch wrapper in `src/worker.tsx`. The runtime would
 * tear the socket down anyway when the request ends, but closing it deliberately
 * lets Supavisor reclaim the slot instead of seeing an abrupt disconnect.
 */
export function closeRequestDb(request: Request, cf?: ExecutionContext): void {
  const handle = handles.get(request);
  if (!handle) return;

  handles.delete(request);
  const closing = handle.pool.end().catch(() => {});

  // waitUntil keeps the isolate alive for the close without delaying the
  // response. Outside a real Worker (scripts, tests) just let it settle.
  cf?.waitUntil?.(closing);
}

/**
 * The ambient handle. Every existing `import { db } from "@/db"` keeps working;
 * the Proxy simply resolves it per request on property access.
 */
export const db = new Proxy({} as Kysely<AppDatabase>, {
  get(_target, property, receiver) {
    const real = requestHandle().db;
    const value = Reflect.get(real, property, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, property) {
    return Reflect.has(requestHandle().db, property);
  },
});

/**
 * Run a callback with a database connection OUTSIDE a request.
 *
 * For `rw-scripts worker-run` scripts (seed, provisioning), which reach the
 * worker's fetch but not rwsdk's routed request pipeline, so there is no request
 * scope to hang a connection on.
 *
 * The ambient `db` works normally inside the callback — including inside
 * anything it calls, such as `provisionTeacher` — so scripts do not have to
 * thread a handle through. The connection is always closed on the way out.
 *
 * Not re-entrant, deliberately: nesting would let an inner `finally` close a
 * connection the outer scope is still using.
 */
export async function withDb<T>(
  fn: (db: Kysely<AppDatabase>) => Promise<T>,
): Promise<T> {
  if (scriptHandle) {
    throw new Error("withDb() is already active — do not nest it.");
  }

  const handle = createHandle();
  scriptHandle = handle;

  try {
    return await fn(handle.db);
  } finally {
    scriptHandle = null;
    await handle.pool.end().catch(() => {});
  }
}

/* -------------------------------------------------------------------------- */
/* Row types — the SELECT shape of each table.                                 */
/*                                                                             */
/* `Selectable<T>` strips the insert/update variance off ColumnType columns, so */
/* these are what a query actually hands back. Postgres gives real `boolean`    */
/* and real `Date` — no more integer 0/1 or ISO strings to convert.            */
/* -------------------------------------------------------------------------- */

export type UserRow = Selectable<UsersTable>;
export type GroupRow = Selectable<GroupsTable>;
export type LocationRow = Selectable<LocationsTable>;
export type EnrollmentRow = Selectable<EnrollmentsTable>;
export type ClassCodeRow = Selectable<ClassCodesTable>;
export type KudosTypeRow = Selectable<KudosTypesTable>;
export type KudosRow = Selectable<KudosTable>;
export type RewardRow = Selectable<RewardsTable>;
export type RedeemedRow = Selectable<RedeemedTable>;
export type LocationHistoryRow = Selectable<LocationHistoryTable>;
export type LoginAttemptRow = Selectable<LoginAttemptsTable>;

/* -------------------------------------------------------------------------- */
/* Enum values.                                                                */
/*                                                                             */
/* The types now come from `@/db/types` and are backed by real Postgres enums,  */
/* so a value read from a row cannot be anything else. The parse* guards that   */
/* used to live here are gone: their justification was "nothing in the database */
/* enforces these values", which stopped being true.                            */
/* -------------------------------------------------------------------------- */

import type { CodeKind, CodeMode, UserRole } from "@/db/types";

export const USER_ROLES: readonly UserRole[] = ["ADMIN", "TEACHER", "STUDENT"];
export const CODE_MODES: readonly CodeMode[] = ["shared", "individual"];
export const CODE_KINDS: readonly CodeKind[] = ["group", "student"];

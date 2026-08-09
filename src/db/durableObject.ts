import { SqliteDurableObject } from "rwsdk/db";

import { migrations } from "@/db/migrations";

/**
 * The application database: a single SQLite-backed Durable Object.
 *
 * `SqliteDurableObject` runs `migrations` via Kysely's Migrator the first time a
 * query reaches it — at dev-server startup and on the first production request.
 * There is no `wrangler d1 migrations apply` step any more.
 *
 * Bound as DATABASE in wrangler.jsonc and re-exported from src/worker.tsx (a
 * Durable Object class must be exported from the worker entry point).
 */
export class Database extends SqliteDurableObject<
  Record<string, unknown>
> {
  migrations = migrations;
}

import { defineScript } from "rwsdk/worker";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";

import type { AppDatabase } from "@/db/types";

/**
 * PHASE 0 — the go/no-go spike for moving off rwsdk/db.
 *
 * Everything in the migration plan sits on top of one question: can Kysely talk
 * to Supabase Postgres from the Cloudflare Workers runtime? This answers it, and
 * nothing else should be built until it passes.
 *
 * It runs under `rw-scripts worker-run`, i.e. inside real workerd, so the
 * outbound TCP path is genuinely exercised — `vite dev` alone would not prove
 * much. A deployed Worker is still the final word on production egress, but if
 * this fails, deploying will not save it.
 *
 *   DATABASE_URL=<pooler uri> npm run db:spike
 *
 * Use the SUPAVISOR POOLER, not the direct connection:
 *
 *   postgres://postgres.<ref>:<pw>@aws-<region>.pooler.supabase.com:6543/postgres
 *
 * The direct `db.<ref>.supabase.co:5432` host is IPv6-only, and Workers cannot
 * open outbound IPv6 connections. The pooler is IPv4 on every tier, so this is a
 * hard requirement rather than a preference.
 *
 * Port 6543 is transaction mode. Kysely's PostgresDialect calls node-postgres's
 * two-argument `query(sql, params)` form and never passes a `name`, and
 * node-postgres only creates a NAMED prepared statement when you supply one — so
 * there is nothing to configure and no flag to forget. That is precisely why
 * this combination was chosen over postgres.js.
 *
 * DELETE THIS FILE once phase 0 has passed. It is a diagnostic, not a fixture.
 */

type Check = { name: string; ok: boolean; detail: string };

const EXPECTED_TABLES = [
  "users",
  "groups",
  "locations",
  "enrollments",
  "classCodes",
  "kudosTypes",
  "kudos",
  "rewards",
  "redeemed",
  "locationHistory",
  "loginAttempts",
] as const;

export default defineScript(async ({ env }) => {
  const secrets = env as unknown as Record<string, string | undefined>;
  const connectionString = secrets.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "\n❌ DATABASE_URL is not set.\n\n" +
        "   Add the SUPAVISOR POOLER uri to .dev.vars (Dashboard -> Connect ->\n" +
        "   Transaction pooler), then re-run:\n\n" +
        "     DATABASE_URL=postgres://postgres.<ref>:<pw>@aws-<region>.pooler.supabase.com:6543/postgres\n",
    );
    return;
  }

  if (connectionString.includes(".supabase.co:5432")) {
    console.error(
      "\n❌ That is the DIRECT connection, which is IPv6-only.\n" +
        "   Workers cannot open outbound IPv6 connections. Use the pooler host\n" +
        "   (…pooler.supabase.com:6543) instead.\n",
    );
    return;
  }

  const checks: Check[] = [];
  const record = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  // Never at module scope: the Workers runtime binds I/O objects to the request
  // that created them, so a socket opened in one request cannot be reused in
  // another. (Different reason from the GoTrueClient warning in
  // src/lib/supabase.ts, same rule.)
  const pool = new pg.Pool({ connectionString, max: 1 });
  const db = new Kysely<AppDatabase>({ dialect: new PostgresDialect({ pool }) });

  try {
    // ---- 1. Can we connect and round-trip at all? ------------------------
    try {
      const result = await sql<{ one: number }>`select 1 as one`.execute(db);
      // Deliberately NOT reporting `pg.native` here — reading that property is
      // a getter that lazily requires pg-native, which is stubbed to throw.
      record("connect + round-trip", result.rows[0]?.one === 1, "via pooler");
    } catch (error) {
      record("connect + round-trip", false, String(error));
      console.error(
        "\n⛔ STOP. Nothing else in the migration is worth attempting until this\n" +
          "   passes. Most likely causes, in order:\n" +
          "     - wrong host (must be …pooler.supabase.com, not db.<ref>.supabase.co)\n" +
          "     - TLS: try appending ?sslmode=require to the uri\n" +
          "     - password not percent-encoded in the uri\n" +
          "     - the Supabase project is paused (free tier, ~7 days idle)\n",
      );
      return;
    }

    // ---- 2. Server identity ---------------------------------------------
    try {
      const v = await sql<{ version: string }>`select version()`.execute(db);
      record("server", true, (v.rows[0]?.version ?? "").split(",")[0] ?? "");
    } catch (error) {
      record("server", false, String(error));
    }

    // ---- 3. Has the schema been pushed? ----------------------------------
    let present: string[] = [];
    try {
      const rows = await sql<{ table_name: string }>`
        select table_name from information_schema.tables
        where table_schema = 'public'
      `.execute(db);
      present = rows.rows.map((r) => r.table_name);
      const missing = EXPECTED_TABLES.filter((t) => !present.includes(t));
      record(
        "schema pushed",
        missing.length === 0,
        missing.length === 0
          ? `all ${EXPECTED_TABLES.length} tables present`
          : `MISSING: ${missing.join(", ")} — run: supabase db push --linked`,
      );
    } catch (error) {
      record("schema pushed", false, String(error));
    }

    // ---- 4. camelCase quoting — the flagged failure mode ------------------
    // Postgres folds unquoted identifiers to lower case while Kysely quotes by
    // default, so a table created unquoted is one the app can never find. This
    // fails at runtime, not build time, so prove it per table.
    if (present.length > 0) {
      const broken: string[] = [];
      for (const table of EXPECTED_TABLES) {
        try {
          await db
            .selectFrom(table as never)
            .select(sql`1`.as("probe"))
            .limit(1)
            .execute();
        } catch (error) {
          broken.push(`${table} (${String(error).slice(0, 60)})`);
        }
      }
      record(
        "camelCase identifiers",
        broken.length === 0,
        broken.length === 0
          ? "every table reachable exactly as Kysely spells it"
          : `UNREACHABLE: ${broken.join("; ")}`,
      );
    }

    // ---- 5. Transaction COMMIT -------------------------------------------
    // The whole point of the migration. rwsdk/db throws here at runtime.
    const marker = `spike-${crypto.randomUUID()}`;
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto("loginAttempts")
          .values({ scope: "spike", key: marker, createdAt: new Date() })
          .execute();
      });
      const found = await db
        .selectFrom("loginAttempts")
        .select("id")
        .where("key", "=", marker)
        .execute();
      record("transaction COMMIT", found.length === 1, `${found.length} row(s)`);
    } catch (error) {
      record("transaction COMMIT", false, String(error));
    }

    // ---- 6. Transaction ROLLBACK -----------------------------------------
    // Kysely rolls back only on a THROWN error. This is the trap the plan calls
    // out: returning a value from the callback commits.
    const rollbackMarker = `spike-rollback-${crypto.randomUUID()}`;
    try {
      await db
        .transaction()
        .execute(async (trx) => {
          await trx
            .insertInto("loginAttempts")
            .values({ scope: "spike", key: rollbackMarker, createdAt: new Date() })
            .execute();
          throw new Error("deliberate rollback");
        })
        .catch(() => {});
      const found = await db
        .selectFrom("loginAttempts")
        .select("id")
        .where("key", "=", rollbackMarker)
        .execute();
      record(
        "transaction ROLLBACK",
        found.length === 0,
        found.length === 0 ? "write correctly discarded" : "LEAKED — not atomic",
      );
    } catch (error) {
      record("transaction ROLLBACK", false, String(error));
    }

    // ---- clean up the spike rows -----------------------------------------
    try {
      await db.deleteFrom("loginAttempts").where("scope", "=", "spike").execute();
    } catch {
      // Non-fatal; these prune themselves on the next rate-limit read anyway.
    }

    const failed = checks.filter((c) => !c.ok);
    console.log(
      failed.length === 0
        ? "\n🟢 PHASE 0 PASSES — Kysely + pg reaches Supabase from workerd, and " +
            "transactions commit and roll back. Proceed to phase 2.\n"
        : `\n🔴 PHASE 0 FAILED on: ${failed.map((c) => c.name).join(", ")}\n` +
            "   Do not proceed. Fix these first.\n",
    );
  } finally {
    await pool.end().catch(() => {});
  }
});

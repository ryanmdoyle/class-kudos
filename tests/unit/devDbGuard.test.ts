import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertLocalDatabaseUrl } from "@/db/localGuard";

import { REPO_ROOT } from "../helpers/env";

/**
 * The app-side guard: "may a development session connect to this database?"
 *
 * This is the check that covers `npm run dev`, `npm run seed`,
 * `npm run provision-teacher` and any future script, because they all resolve the
 * same `db` proxy in `@/db`. The rule is pure and the Worker-only inputs (`IS_DEV`,
 * the `ALLOW_REMOTE_DB` binding) are passed in, which is what makes it testable here
 * rather than only through a running Worker.
 *
 * Distinct from `testDatabaseGuard.test.ts`, which covers the HARNESS's own check —
 * the harness opens its own `pg` pool and never goes through `@/db`.
 */
describe("the dev-only database guard", () => {
  const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const REMOTE =
    "postgresql://postgres.xkvmtgpmafwmrajzsyjq:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

  const dev = { isDev: true, allowRemote: false };
  const prod = { isDev: false, allowRemote: false };

  it("allows a local database in development", () => {
    expect(() => assertLocalDatabaseUrl(LOCAL, dev)).not.toThrow();
    expect(() =>
      assertLocalDatabaseUrl(
        "postgresql://postgres.postgres:postgres@127.0.0.1:54329/postgres",
        dev,
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabaseUrl("postgresql://u:p@localhost:54322/postgres", dev),
    ).not.toThrow();
  });

  it("refuses a remote database in development, naming the fix", () => {
    expect(() => assertLocalDatabaseUrl(REMOTE, dev)).toThrow(/Refusing to connect/);
    expect(() => assertLocalDatabaseUrl(REMOTE, dev)).toThrow(/not undoable/);
    expect(() => assertLocalDatabaseUrl(REMOTE, dev)).toThrow(/\.dev\.vars/);
    /* The host, so the reason is obvious without re-reading the config. */
    expect(() => assertLocalDatabaseUrl(REMOTE, dev)).toThrow(/pooler\.supabase\.com/);
  });

  it("NEVER fires in production, where remote is the only kind of database", () => {
    /*
     * The most important case in this file. If this ever throws, the deployed Worker
     * cannot reach Postgres at all and the whole site is down — so it is worth an
     * explicit test rather than trusting the `!isDev` early return to stay put.
     */
    expect(() => assertLocalDatabaseUrl(REMOTE, prod)).not.toThrow();
    expect(() =>
      assertLocalDatabaseUrl(REMOTE, { isDev: false, allowRemote: true }),
    ).not.toThrow();
  });

  it("lets a deliberate opt-in through", () => {
    expect(() =>
      assertLocalDatabaseUrl(REMOTE, { isDev: true, allowRemote: true }),
    ).not.toThrow();
  });

  it("refuses any other remote host, not just Supabase", () => {
    for (const url of [
      "postgresql://u:p@db.example.com:5432/postgres",
      "postgresql://u:p@10.0.0.5:5432/postgres",
      "postgresql://u:p@192.168.1.20:5432/postgres",
    ]) {
      expect(() => assertLocalDatabaseUrl(url, dev), url).toThrow(/Refusing to connect/);
    }
  });

  it("defers to pg on an unparseable url", () => {
    /*
     * A malformed connection string cannot reach production, so throwing here would
     * only replace pg's clearer error with a misleading one about locality.
     */
    expect(() => assertLocalDatabaseUrl("not a url", dev)).not.toThrow();
  });
});

/**
 * The WIRING — that `createHandle()` actually calls the rule.
 *
 * Every test above imports `localGuard` directly, so deleting the call from
 * `src/db/index.ts` would leave all of them green while dev happily connected to
 * production. Nothing else can see that: `@/db` reaches `cloudflare:workers`, so it
 * cannot be imported from a Node test at all — `tsconfig.test.json` makes attempting
 * it a compile error on purpose.
 *
 * So this asserts on source text. Cruder than asserting on behaviour, and used
 * deliberately rather than by default: the alternative is a Worker test for one line.
 * `tests/unit/sentry.test.ts` guards `Sentry.init` the same way and for the same
 * reason, so the idiom is not new here.
 */
describe("createHandle applies the guard", () => {
  /*
   * Scoped to createHandle's body ON PURPOSE. An earlier version of this test
   * searched the whole file, which made it useless: deleting the call from
   * createHandle left the identical text sitting in a helper defined above it, so
   * the mutation passed. The helper has since been inlined, and this now looks only
   * where the call has to actually be.
   */
  const source = readFileSync(path.join(REPO_ROOT, "src/db/index.ts"), "utf8");
  const body = source.slice(source.indexOf("function createHandle(): DbHandle {"));

  it("calls the guard before opening a pool", () => {
    const guardAt = body.indexOf("assertLocalDatabaseUrl(connectionString");
    const poolAt = body.indexOf("new pg.Pool(");

    expect(
      guardAt,
      "createHandle no longer calls the guard, so a non-local DATABASE_URL in " +
        ".dev.vars would be used silently by dev, seed and every script",
    ).toBeGreaterThan(-1);
    expect(poolAt).toBeGreaterThan(-1);
    expect(
      guardAt,
      "the guard must run BEFORE the pool is created, or it has already connected",
    ).toBeLessThan(poolAt);
  });

  it("passes IS_DEV and the .dev.vars override in, rather than hardcoding them", () => {
    /*
     * If either input were hardcoded the guard would be either useless (always
     * allow) or catastrophic (firing in production, where remote is the only kind of
     * database there is).
     */
    expect(source).toMatch(/isDev:\s*IS_DEV/);
    expect(source).toMatch(/allowRemote:\s*appEnv\.ALLOW_REMOTE_DB === "1"/);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertLocalDatabase, databaseUrl } from "../helpers/env";

/**
 * The guard that stops the suite destroying real data.
 *
 * `tests/helpers/env.ts` refuses a non-local database because the fixtures do not
 * read, they DESTROY: every integration test creates a group, spends a balance to
 * zero, races requests at it and deletes everything. Correct against the local
 * stack; against the online project it is a real classroom's roster and points
 * children earned, with no undo.
 *
 * The only thing separating those outcomes is which file was last copied over
 * `.env` — so this is worth testing properly rather than trusting.
 */
describe("refusing a non-local test database", () => {
  const saved = process.env.ALLOW_REMOTE_TEST_DB;

  beforeEach(() => {
    delete process.env.ALLOW_REMOTE_TEST_DB;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.ALLOW_REMOTE_TEST_DB;
    else process.env.ALLOW_REMOTE_TEST_DB = saved;
  });

  it("allows the local stack, direct and through the local pooler", () => {
    /* 54322 is Postgres itself; 54329 is the local Supavisor. Both are fine. */
    expect(() =>
      assertLocalDatabase("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase(
        "postgresql://postgres.postgres:postgres@127.0.0.1:54329/postgres",
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase("postgresql://postgres:postgres@localhost:54322/postgres"),
    ).not.toThrow();
  });

  it("refuses the online project, naming the fix", () => {
    const online =
      "postgresql://postgres.xkvmtgpmafwmrajzsyjq:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

    expect(() => assertLocalDatabase(online)).toThrow(/Refusing to run/);
    expect(() => assertLocalDatabase(online)).toThrow(/CREATES AND DESTROYS/);
    /* The message has to say what to do, not just that it refused. */
    expect(() => assertLocalDatabase(online)).toThrow(/npm run env:local/);
    /* And it should name the host, so the reason is obvious at a glance. */
    expect(() => assertLocalDatabase(online)).toThrow(/pooler\.supabase\.com/);
  });

  it("refuses any other remote host", () => {
    for (const url of [
      "postgresql://u:p@db.example.com:5432/postgres",
      "postgresql://u:p@10.0.0.5:5432/postgres",
      "postgresql://u:p@192.168.1.20:5432/postgres",
    ]) {
      expect(() => assertLocalDatabase(url), url).toThrow(/Refusing to run/);
    }
  });

  it("lets an explicit opt-in through", () => {
    /*
     * The escape hatch is deliberate: pointing the harness at the real Supavisor
     * pooler is the one legitimate reason to use a remote database (STACK.md §4),
     * and it should be possible without editing the guard.
     */
    process.env.ALLOW_REMOTE_TEST_DB = "1";
    expect(() =>
      assertLocalDatabase(
        "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).not.toThrow();
  });

  it("only accepts exactly \"1\" as the opt-in", () => {
    /*
     * So a stray `ALLOW_REMOTE_TEST_DB=false` or `=0` in a shell profile cannot
     * disarm it by being merely present.
     */
    for (const value of ["0", "false", "", "true", "yes"]) {
      process.env.ALLOW_REMOTE_TEST_DB = value;
      expect(
        () => assertLocalDatabase("postgresql://u:p@db.example.com:5432/postgres"),
        `ALLOW_REMOTE_TEST_DB=${JSON.stringify(value)} must not disarm the guard`,
      ).toThrow(/Refusing to run/);
    }
  });

  it("defers to pg on an unparseable url", () => {
    /*
     * A malformed connection string cannot reach production, so throwing here would
     * only replace pg's clearer error with a misleading one about locality.
     */
    expect(() => assertLocalDatabase("not a url at all")).not.toThrow();
  });
});

/**
 * The WIRING, not just the guard.
 *
 * Every test above calls `assertLocalDatabase` directly, which means deleting the
 * call to it from `databaseUrl()` would leave all of them green while the suite
 * happily connected to production. This is the test that notices — the guard is only
 * worth anything if the thing that resolves the connection string actually runs it.
 */
describe("databaseUrl applies the guard", () => {
  const savedTest = process.env.TEST_DATABASE_URL;
  const savedMain = process.env.DATABASE_URL;
  const savedAllow = process.env.ALLOW_REMOTE_TEST_DB;

  const restore = () => {
    for (const [key, value] of [
      ["TEST_DATABASE_URL", savedTest],
      ["DATABASE_URL", savedMain],
      ["ALLOW_REMOTE_TEST_DB", savedAllow],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  beforeEach(() => {
    delete process.env.ALLOW_REMOTE_TEST_DB;
  });
  afterEach(restore);

  it("refuses when the resolved url is remote", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    expect(() => databaseUrl()).toThrow(/Refusing to run/);
  });

  it("returns the url when it is local", () => {
    const local = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    process.env.TEST_DATABASE_URL = local;
    expect(databaseUrl()).toBe(local);
  });

  it("checks the DATABASE_URL fallback too, not only TEST_DATABASE_URL", () => {
    /*
     * The common case: no TEST_DATABASE_URL set, and `.env` left pointing at the
     * online project by `npm run env:remote`. That is the exact accident this
     * whole guard exists for, so it must be covered on the fallback path.
     */
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL =
      "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    expect(() => databaseUrl()).toThrow(/Refusing to run/);
  });
});

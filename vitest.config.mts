import { fileURLToPath } from "node:url";
/*
 * Two imports, deliberately. `defineConfig` must come from "vitest/config" —
 * Vite's own overload has no `test` key and rejects this file outright under
 * `npm run types:test`. But vitest@4's "vitest/config" does NOT re-export Vite's
 * env helpers (its exports are: configDefaults, coverageConfigDefaults,
 * defaultBrowserPort, defaultExclude, defaultInclude, defineConfig,
 * defineProject, mergeConfig), so `loadEnv` still comes from "vite".
 */
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

/**
 * Test runner configuration. Two projects, deliberately unequal:
 *
 *   unit         — pure functions. No database, no dev server, no env. Runs on a
 *                  fresh clone with nothing installed but node_modules, which is
 *                  what makes `npm test` safe to gate CI on.
 *   integration  — drives a real `vite dev` over HTTP and asserts against a real
 *                  Postgres. This is the only place the concurrency guarantees
 *                  can be observed at all, because the guarantee IS the database.
 *
 * ==========================================================================
 * THIS FILE REPLACES vite.config.mts FOR TESTS, AND THAT IS THE POINT.
 *
 * When a `vitest.config.*` exists, Vitest loads it INSTEAD of `vite.config.mts`
 * — so `redwood()`, `cloudflare()` and `tailwindcss()` never run here. We do not
 * want them to: the RSC transform, the directive scan and the workerd
 * environment are what the integration tests exercise THROUGH the dev server,
 * over HTTP. Pulling them into the test process would mean testing a second,
 * differently-built copy of the app.
 *
 * The cost is that two things `vite.config.mts` provides for free must be
 * restated below: the `@/` alias and the `pg-native` stub.
 * ==========================================================================
 */

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * `.env` is the single source of truth, and `.dev.vars` is a SYMLINK to it — so
 * the values loaded here are byte-identical to the ones `vite dev` hands the
 * worker. There is no drift between harness and app to reason about.
 *
 * Prefix "" means "load every key", not just `VITE_*`. loadEnv also picks up
 * `.env.local` and `.env.test` if they ever appear, with the usual precedence.
 */
const env = loadEnv("test", r("."), "");

/**
 * Publish into `process.env` as well as `test.env` below.
 *
 * `test.env` only reaches the TEST WORKER environments. `globalSetup` runs in
 * Vitest's main process, where it sweeps orphan fixtures and probes the dev
 * server — and it needs DATABASE_URL before any worker exists. Without this it
 * fails with "No TEST_DATABASE_URL or DATABASE_URL" while `.env` is sitting
 * right there, correctly populated.
 *
 * Existing values win, so `DATABASE_URL=… npm run test:integration` still
 * overrides the file.
 */
for (const key of [
  "DATABASE_URL",
  "TEST_DATABASE_URL",
  "SUPABASE_URL",
  "AUTH_SECRET_KEY",
  "TEST_BASE_URL",
  "TEST_SERVER",
] as const) {
  if (process.env[key] === undefined && env[key] !== undefined) {
    process.env[key] = env[key];
  }
}

/**
 * Shared by the root and BOTH projects. Vitest projects do not inherit the root
 * `resolve` on every code path, so this is spread into each one rather than
 * declared once at the top.
 */
const alias = {
  /*
   * vite.config.mts gets `@/*` -> `./src/*` from tsconfig `paths`, resolved by
   * vite-tsconfig-paths, which `redwood()` pulls in. redwood() is deliberately
   * absent here (see the header), so the alias is declared directly. One line
   * beats taking a hoisting bet on a transitive dependency.
   */
  "@": r("./src"),
  /*
   * Mirrors vite.config.mts. Not strictly required today — Vitest externalises
   * node_modules to Node's own loader, so `pg` is require()d normally and
   * pg/lib/native stays behind its lazy getter. Kept as one-line insurance so a
   * future `server.deps.inline: ["pg"]` cannot resurrect the pg-native build
   * error that vite.config.mts exists to prevent.
   */
  "pg-native": r("./src/lib/pgNativeStub.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          root: r("."),
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          /*
           * No `env`, no `globalSetup`, no `setupFiles`: zero external
           * dependencies by construction. If a test in here needs a database
           * URL or a running server, it is not a unit test — move it.
           */
          testTimeout: 5_000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          root: r("."),
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: {
            DATABASE_URL: env.DATABASE_URL ?? "",
            TEST_DATABASE_URL: env.TEST_DATABASE_URL ?? "",
            SUPABASE_URL: env.SUPABASE_URL ?? "",
            AUTH_SECRET_KEY: env.AUTH_SECRET_KEY ?? "",
            TEST_BASE_URL: env.TEST_BASE_URL ?? "http://localhost:5173",
            TEST_SERVER: env.TEST_SERVER ?? "",
          },
          globalSetup: ["tests/setup/globalSetup.ts"],
          setupFiles: ["tests/setup/integrationSetup.ts"],
          /*
           * ONE dev server, and every race under test is a race between HTTP
           * REQUESTS INSIDE A SINGLE TEST — never between test files. So
           * parallel files buy no coverage, and they cost reproducibility:
           * shared rate-limit budgets stop being legible and a failure stops
           * being replayable. Serial is not a workaround here, it is correct.
           */
          fileParallelism: false,
          sequence: { concurrent: false },
          testTimeout: 30_000,
          /* beforeAll may pay a dev-server recompile after an HMR invalidation. */
          hookTimeout: 120_000,
          /*
           * NEVER retry. A race test that passes on the second attempt has
           * proven nothing at all, and a green retry actively hides the bug it
           * was written to catch.
           */
          retry: 0,
        },
      },
    ],
  },
});

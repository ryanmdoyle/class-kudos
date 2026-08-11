import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { AppDatabase } from "@/db/types";

import { TEST_PREFIX, databaseUrl } from "./env";

/**
 * The harness's own database handle: plain Node, plain `pg`, plain Kysely.
 *
 * ==========================================================================
 * NEVER IMPORT `@/db` HERE.
 *
 * It is not merely request-scoped. It reaches `cloudflare:workers` through
 * `@/lib/env`, and that specifier does not resolve outside the Worker — the
 * failure is at IMPORT time, so `withDb()` cannot help. `tsconfig.test.json`
 * drops @cloudflare/workers-types specifically so that attempting it is a
 * compile error here rather than a confusing runtime one. The same applies to
 * every module under `@/auth/`.
 *
 * `@/db/types` IS safe, and is what we import: it declares only
 * `type { ColumnType, Generated } from "kysely"`. Using the real row types means
 * a drift between the harness and `supabase/migrations/*.sql` shows up as a type
 * error instead of a silently wrong assertion.
 * ==========================================================================
 *
 * ==========================================================================
 * A MODULE-SCOPE POOL IS CORRECT HERE, AND ONLY HERE.
 *
 * The long header on `src/db/index.ts` forbids one because the WORKERS RUNTIME
 * binds every I/O object to the request that created it. That rule is a property
 * of workerd, not of Postgres. This file runs in Node, where a pool is just a
 * pool. Do not "fix" this into a per-test handle: you would pay a fresh
 * connection per test for nothing.
 * ==========================================================================
 */

let handle: { db: Kysely<AppDatabase>; pool: pg.Pool } | null = null;

export function testDb(): Kysely<AppDatabase> {
  if (!handle) {
    const connectionString = databaseUrl();
    /*
     * Wider than the app's `max: 1`, and for a different reason: the app gets
     * one connection per REQUEST, while the harness is a single process that
     * builds fixtures and asserts results. 4 is enough to keep teardown from
     * serialising behind assertions without holding many idle connections.
     */
    const pool = new pg.Pool({ connectionString, max: 4 });
    handle = {
      pool,
      db: new Kysely<AppDatabase>({ dialect: new PostgresDialect({ pool }) }),
    };
  }
  return handle.db;
}

export async function closeTestDb(): Promise<void> {
  if (!handle) return;
  const { pool } = handle;
  handle = null;
  await pool.end().catch(() => {});
}

/**
 * Delete fixture rows left behind by a crashed run.
 *
 * Scoped two ways so it can never touch real data: only groups whose name starts
 * with TEST_PREFIX, and only ones older than `olderThanMs` (so it cannot race a
 * run happening right now). Called once from globalSetup.
 *
 * Student `users` rows are collected BEFORE the group is deleted — afterwards
 * their enrollments have cascaded away and there is no way to find them again.
 */
export async function sweepOrphanFixtures(
  olderThanMs = 60 * 60 * 1000,
): Promise<{ groups: number; users: number }> {
  const db = testDb();
  const cutoff = new Date(Date.now() - olderThanMs);

  const stale = await db
    .selectFrom("groups")
    .select(["id"])
    .where("name", "like", `${TEST_PREFIX}%`)
    .where("createdAt", "<", cutoff)
    .execute();

  if (stale.length === 0) return { groups: 0, users: 0 };
  const groupIds = stale.map((g) => g.id);

  const enrolled = await db
    .selectFrom("enrollments")
    .select("userId")
    .where("groupId", "in", groupIds)
    .execute();

  await db.deleteFrom("groups").where("id", "in", groupIds).execute();

  let users = 0;
  const userIds = [...new Set(enrolled.map((e) => e.userId))];
  if (userIds.length > 0) {
    /*
     * `role = 'STUDENT'` is a guard, not a filter: it makes it impossible for a
     * stray id to delete the seeded teacher, whose row every other fixture
     * depends on.
     */
    const result = await db
      .deleteFrom("users")
      .where("id", "in", userIds)
      .where("role", "=", "STUDENT")
      .executeTakeFirst();
    users = Number(result.numDeletedRows ?? 0n);
  }

  /* Foreign teachers created by createForeignTeacher(), same age bound. */
  await db
    .deleteFrom("users")
    .where("role", "=", "TEACHER")
    .where("email", "like", `${TEST_PREFIX}%`)
    .where("createdAt", "<", cutoff)
    .execute();

  return { groups: groupIds.length, users };
}

/* ------------------------------------------------------- assertion shortcuts */

/** Current points for an enrollment. Throws if the enrollment is gone. */
export async function pointsOf(enrollmentId: string): Promise<number> {
  const row = await testDb()
    .selectFrom("enrollments")
    .select("points")
    .where("id", "=", enrollmentId)
    .executeTakeFirst();
  if (!row) throw new Error(`enrollment ${enrollmentId} not found`);
  return row.points;
}

export async function countRedeemed(groupId: string): Promise<number> {
  const row = await testDb()
    .selectFrom("redeemed")
    .select(({ fn }) => fn.countAll<string>().as("n"))
    .where("groupId", "=", groupId)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

export async function countKudos(groupId: string): Promise<number> {
  const row = await testDb()
    .selectFrom("kudos")
    .select(({ fn }) => fn.countAll<string>().as("n"))
    .where("groupId", "=", groupId)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

/** Open (not yet left) location-history rows for a group. */
export async function openLocationHistory(groupId: string) {
  return testDb()
    .selectFrom("locationHistory")
    .selectAll()
    .where("groupId", "=", groupId)
    .where("leftAt", "is", null)
    .execute();
}

/**
 * Clear the rate-limit budget for a client IP.
 *
 * `loginAttempts` is a real table and it PERSISTS across tests and runs, so a
 * test that deliberately exhausts a budget must clean up after itself or it
 * poisons every later test sharing that key.
 */
export async function clearLoginAttempts(ipPrefix: string): Promise<void> {
  await testDb()
    .deleteFrom("loginAttempts")
    .where("key", "like", `${ipPrefix}%`)
    .execute();
}

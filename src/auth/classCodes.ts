import "server-only";

import type { Kysely, Transaction } from "kysely";

import { db, type AppDatabase, type CodeKind, type CodeMode } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";
import {
  GROUP_CODE_LENGTH,
  STUDENT_CODE_LENGTH,
  generateUniqueCode,
  hashCode,
} from "@/app/lib/codes";
import { assertTeacherOwnsGroup } from "@/auth/context";

/**
 * Teacher-side class-code management.
 *
 * NOT a "use server" module. If the teacher UI needs one of these from the
 * client, wrap it in an explicit action file and call `assertTeacherOwnsGroup`
 * (or rely on the call these functions already make).
 *
 * Every exported function except `ensureGroupCode` starts with
 * `assertTeacherOwnsGroup(groupId)`, which filters on `ownerId` inside the query
 * and throws 404 (not 403) so group ids are not enumerable. `ensureGroupCode` is
 * the deliberate exception — see its own comment.
 *
 * ==========================================================================
 * THE `executor` PARAMETER
 *
 * Every function here takes a trailing
 *
 *     executor: Kysely<AppDatabase> | Transaction<AppDatabase> = db
 *
 * so it can either run on its own (the default, unchanged for every existing
 * call site) or JOIN A CALLER'S TRANSACTION — `addGroup` inserts the group and
 * calls `ensureGroupCode` with the same `trx`, and the two now commit or roll
 * back together.
 *
 * `Transaction<DB>` extends `Kysely<DB>` in Kysely, so the union is
 * documentation rather than a widening: the bodies are identical either way.
 *
 * Passing the handle is NOT optional politeness. `db` from "@/db" is a
 * request-scoped proxy over a `pg.Pool` with `max: 1`, so a helper that closes
 * over the ambient `db` while a transaction is open does not merely run outside
 * that transaction — it asks the pool for a second connection that the open
 * transaction is holding, and the request HANGS until the runtime kills it.
 * Wrong results would be the good outcome; a deadlock is the real one.
 * ==========================================================================
 */

/** The union used for every `executor` parameter below. */
type Executor = Kysely<AppDatabase> | Transaction<AppDatabase>;

/**
 * Has this exact code already been issued?
 *
 * Must run on the SAME executor as the insert that follows it. Inside a
 * transaction that is what lets it see codes inserted EARLIER IN THE SAME
 * TRANSACTION — `issueStudentCodesForGroup` writes thirty codes in one go, and
 * an ambient-`db` check would be blind to the twenty-nine before it.
 */
async function isCodeTaken(code: string, executor: Executor): Promise<boolean> {
  const codeHash = await hashCode(code);
  const existing = await executor
    .selectFrom("classCodes")
    .select("id")
    .where("codeHash", "=", codeHash)
    .executeTakeFirst();
  return Boolean(existing);
}

/** How many fresh codes to try before giving up on a collision. */
const CODE_INSERT_ATTEMPTS = 5;

async function insertCode(
  params: {
    kind: CodeKind;
    groupId: string;
    enrollmentId: string | null;
    length: number;
  },
  executor: Executor,
): Promise<string> {
  /**
   * Collision handling, in two layers, both of which are transaction-safe.
   *
   * 1. `generateUniqueCode` rejects a candidate that a SELECT already finds
   *    (`isCodeTaken`, on `executor`). Cheap, and it reads this transaction's
   *    own uncommitted rows.
   *
   * 2. The insert then says `on conflict ("code") do nothing returning "code"`
   *    and the loop reruns when nothing comes back.
   *
   * Layer 2 replaces a `try { insert } catch { retry }` loop that CANNOT WORK
   * INSIDE A TRANSACTION: in Postgres a failed statement aborts the whole
   * transaction, so the second attempt would die with "current transaction is
   * aborted" and take the caller's work with it. `on conflict do nothing` does
   * not raise, so it does not abort, so the retry is legal where it stands and
   * the caller never has to know this loop exists.
   *
   * DO NOT "simplify" the `on conflict ... returning` away now that
   * transactions exist. It is not the transaction's job: it is what makes a
   * lost race between the SELECT and the INSERT a retry instead of a 500, and
   * under READ COMMITTED that race is still there.
   *
   * The conflict target is `("code")` and NOT a bare `do nothing`, on purpose.
   * A bare `do nothing` swallows a conflict on ANY unique index on the table,
   * which here would silently reinterpret "this enrollment already has a code"
   * (`classCodes_enrollmentId_unique`) or "this group already has a shared
   * code" (`classCodes_groupId_shared_unique`) as a code collision, burn all
   * five attempts, and report the wrong failure. Those two are real bugs and
   * must surface. `"codeHash"` needs no target of its own: it is a pure
   * function of `"code"`, so a hash conflict without a code conflict would be a
   * SHA-256 collision.
   */
  for (let attempt = 0; attempt < CODE_INSERT_ATTEMPTS; attempt++) {
    const code = await generateUniqueCode({
      length: params.length,
      isTaken: (candidate) => isCodeTaken(candidate, executor),
    });

    const inserted = await executor
      .insertInto("classCodes")
      .values({
        id: newId(),
        code,
        codeHash: await hashCode(code),
        kind: params.kind,
        groupId: params.groupId,
        enrollmentId: params.enrollmentId,
        createdAt: nowIso(),
        lastUsedAt: null,
      })
      .onConflict((oc) => oc.column("code").doNothing())
      .returning("code")
      .executeTakeFirst();

    if (inserted) return inserted.code;
  }

  throw new Error(
    `Could not issue a class code after ${CODE_INSERT_ATTEMPTS} attempts: ` +
      `every generated code collided with an existing one. The code space may ` +
      `be saturated — consider increasing the code length.`,
  );
}

/* -------------------------------------------------------------------------- */
/* Mode                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Switch a group between "one code for the whole class" (`shared`) and "a code
 * per student" (`individual`).
 *
 * Codes of the other kind are deliberately NOT deleted. `resolveCode()` refuses
 * any code whose `kind` does not match the group's CURRENT `codeMode`, so the
 * change takes effect instantly and switching back does not force a reprint.
 *
 * The mode flip and the code back-fill ALWAYS land together: given a `trx` this
 * joins it, and without one it opens its own transaction. Nothing in the app
 * repairs a half-applied mode change — the Options page only reads — so a group
 * left in `individual` mode with no per-student codes would simply lock the
 * class out until a teacher noticed and pressed a button.
 */
export async function setGroupCodeMode(
  groupId: string,
  mode: CodeMode,
  executor?: Executor,
): Promise<void> {
  if (!executor) {
    return db.transaction().execute((trx) => setGroupCodeMode(groupId, mode, trx));
  }

  await assertTeacherOwnsGroup(groupId, executor);

  await executor
    .updateTable("groups")
    .set({ codeMode: mode, updatedAt: nowIso() })
    .where("id", "=", groupId)
    .execute();

  if (mode === "shared") {
    await ensureGroupCode(groupId, executor);
  } else {
    await issueStudentCodesForGroup(groupId, { onlyMissing: true }, executor);
  }
}

/* -------------------------------------------------------------------------- */
/* Shared group code                                                           */
/* -------------------------------------------------------------------------- */

/** The group's shared code, or null if it has never been generated. */
export async function getGroupCode(
  groupId: string,
  executor: Executor = db,
): Promise<string | null> {
  await assertTeacherOwnsGroup(groupId, executor);

  const row = await executor
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  return row?.code ?? null;
}

/**
 * Create the shared code if there isn't one. Returns the existing or new code.
 *
 * The ONE exported function here that does not call `assertTeacherOwnsGroup`,
 * and it must stay that way: `addGroup` calls it inside the transaction that
 * INSERTS the group, and an ownership check would have to see a row that is not
 * committed yet. Callers own the check — `ensureSharedCode` asserts, `addGroup`
 * has just created the group as the requesting teacher.
 */
export async function ensureGroupCode(
  groupId: string,
  executor: Executor = db,
): Promise<string> {
  const existing = await executor
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  if (existing) return existing.code;

  return insertCode(
    {
      kind: "group",
      groupId,
      enrollmentId: null,
      length: GROUP_CODE_LENGTH,
    },
    executor,
  );
}

/**
 * Replace the shared code for a group (the "regenerate" button). The retired
 * string returns to the pool, which is correct — it is no longer valid anywhere.
 *
 * Delete-then-insert, ALWAYS atomic: it joins a supplied `trx` or opens its own.
 * It must be. `insertCode` throws after five collisions, and a failure between
 * the two statements would leave the group with NO shared code — locking every
 * student in the class out of the app, with no automatic repair anywhere (the
 * Options page only reads; the sole fix is a teacher finding the manual button).
 */
export async function rotateGroupCode(
  groupId: string,
  executor?: Executor,
): Promise<string> {
  if (!executor) {
    return db.transaction().execute((trx) => rotateGroupCode(groupId, trx));
  }

  await assertTeacherOwnsGroup(groupId, executor);

  await executor
    .deleteFrom("classCodes")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .execute();

  return insertCode(
    {
      kind: "group",
      groupId,
      enrollmentId: null,
      length: GROUP_CODE_LENGTH,
    },
    executor,
  );
}

/* -------------------------------------------------------------------------- */
/* Per-student codes                                                           */
/* -------------------------------------------------------------------------- */

export type StudentCodeRow = {
  enrollmentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  code: string | null;
};

async function listStudentCodes(
  groupId: string,
  executor: Executor,
): Promise<StudentCodeRow[]> {
  return executor
    .selectFrom("enrollments")
    .innerJoin("users", "users.id", "enrollments.userId")
    // classCodes.enrollmentId is UNIQUE, so this left join is 1:0..1 — no
    // fan-out, no need to guard against duplicate rows.
    .leftJoin("classCodes", "classCodes.enrollmentId", "enrollments.id")
    .select([
      "enrollments.id as enrollmentId",
      "users.id as userId",
      "users.firstName as firstName",
      "users.lastName as lastName",
      "classCodes.code as code",
    ])
    .where("enrollments.groupId", "=", groupId)
    .orderBy("users.firstName", "asc")
    .orderBy("users.lastName", "asc")
    .execute();
}

/**
 * Create or RESET one student's personal code. Returns the new code.
 * Identified by enrollment, so a student in two classes has two codes.
 */
export async function issueStudentCode(
  groupId: string,
  enrollmentId: string,
  executor?: Executor,
): Promise<string> {
  // Delete-then-insert, so it is always atomic: joins a supplied `trx`, or opens
  // its own. A failure between the two would leave that student with no code and
  // no way in, and nothing repairs it automatically.
  if (!executor) {
    return db
      .transaction()
      .execute((trx) => issueStudentCode(groupId, enrollmentId, trx));
  }

  await assertTeacherOwnsGroup(groupId, executor);

  const enrollment = await executor
    .selectFrom("enrollments")
    .select("id")
    .where("id", "=", enrollmentId)
    .where("groupId", "=", groupId)
    .executeTakeFirst();

  if (!enrollment) {
    throw new Error("That student is not enrolled in this group.");
  }

  // Delete first: `classCodes_enrollmentId_unique` allows exactly one code per
  // enrollment, so a reset is a replace. Inside a `trx` the two are atomic.
  await executor
    .deleteFrom("classCodes")
    .where("enrollmentId", "=", enrollmentId)
    .execute();

  return insertCode(
    {
      kind: "student",
      groupId,
      enrollmentId,
      length: STUDENT_CODE_LENGTH,
    },
    executor,
  );
}

/** Convenience wrapper for UIs that only hold a userId. */
export async function issueStudentCodeForUser(
  groupId: string,
  userId: string,
  executor: Executor = db,
): Promise<string> {
  await assertTeacherOwnsGroup(groupId, executor);

  const enrollment = await executor
    .selectFrom("enrollments")
    .select("id")
    .where("groupId", "=", groupId)
    .where("userId", "=", userId)
    .executeTakeFirst();

  if (!enrollment) {
    throw new Error("That student is not enrolled in this group.");
  }

  return issueStudentCode(groupId, enrollment.id, executor);
}

/**
 * Bulk-generate for printing.
 *
 * `onlyMissing: true` (the default) leaves already-issued codes alone so a
 * reprint does not silently invalidate the cards half the class is already
 * holding.
 *
 * `executor` is the THIRD parameter so the existing two-argument call sites are
 * untouched.
 */
export async function issueStudentCodesForGroup(
  groupId: string,
  { onlyMissing = true }: { onlyMissing?: boolean } = {},
  executor: Executor = db,
): Promise<StudentCodeRow[]> {
  await assertTeacherOwnsGroup(groupId, executor);

  const students = await listStudentCodes(groupId, executor);
  const results: StudentCodeRow[] = [];

  for (const student of students) {
    if (student.code && onlyMissing) {
      results.push(student);
      continue;
    }
    const code = await issueStudentCode(groupId, student.enrollmentId, executor);
    results.push({ ...student, code });
  }

  return results;
}

export async function revokeStudentCode(
  groupId: string,
  enrollmentId: string,
  executor: Executor = db,
): Promise<void> {
  await assertTeacherOwnsGroup(groupId, executor);

  await executor
    .deleteFrom("classCodes")
    .where("enrollmentId", "=", enrollmentId)
    .where("groupId", "=", groupId)
    .execute();
}

/* -------------------------------------------------------------------------- */
/* The printing view                                                           */
/* -------------------------------------------------------------------------- */

export type GroupCodesView = {
  mode: CodeMode;
  groupCode: string | null;
  students: StudentCodeRow[];
};

/** Everything a teacher needs to print codes for one group. */
export async function getGroupCodes(
  groupId: string,
  executor: Executor = db,
): Promise<GroupCodesView> {
  await assertTeacherOwnsGroup(groupId, executor);

  const group = await executor
    .selectFrom("groups")
    .select("codeMode")
    .where("id", "=", groupId)
    .executeTakeFirst();

  const groupCode = await executor
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  return {
    mode: (group?.codeMode as CodeMode | undefined) ?? "shared",
    groupCode: groupCode?.code ?? null,
    students: await listStudentCodes(groupId, executor),
  };
}

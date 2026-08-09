import "server-only";

import { db, type CodeKind, type CodeMode } from "@/db";
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
 * Every exported function starts with `assertTeacherOwnsGroup(groupId)`, which
 * filters on `ownerId` inside the query and throws 404 (not 403) so group ids
 * are not enumerable.
 */

async function isCodeTaken(code: string): Promise<boolean> {
  const codeHash = await hashCode(code);
  const existing = await db
    .selectFrom("classCodes")
    .select("id")
    .where("codeHash", "=", codeHash)
    .executeTakeFirst();
  return Boolean(existing);
}

async function insertCode(params: {
  kind: CodeKind;
  groupId: string;
  enrollmentId: string | null;
  length: number;
}): Promise<string> {
  // Retry on the UNIQUE(code)/UNIQUE(codeHash) constraint: two teachers can
  // generate codes concurrently and lose the race between the isTaken check and
  // the insert. The database, not the check, is the source of truth.
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await generateUniqueCode({
      length: params.length,
      isTaken: isCodeTaken,
    });

    try {
      await db
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
        .execute();

      return code;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Could not issue a class code after 5 attempts: ${String(lastError)}`,
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
 */
export async function setGroupCodeMode(
  groupId: string,
  mode: CodeMode,
): Promise<void> {
  await assertTeacherOwnsGroup(groupId);

  await db
    .updateTable("groups")
    .set({ codeMode: mode, updatedAt: nowIso() })
    .where("id", "=", groupId)
    .execute();

  if (mode === "shared") {
    await ensureGroupCode(groupId);
  } else {
    await issueStudentCodesForGroup(groupId, { onlyMissing: true });
  }
}

/* -------------------------------------------------------------------------- */
/* Shared group code                                                           */
/* -------------------------------------------------------------------------- */

/** The group's shared code, or null if it has never been generated. */
export async function getGroupCode(groupId: string): Promise<string | null> {
  await assertTeacherOwnsGroup(groupId);

  const row = await db
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  return row?.code ?? null;
}

/** Create the shared code if there isn't one. Returns the existing or new code. */
export async function ensureGroupCode(groupId: string): Promise<string> {
  const existing = await db
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  if (existing) return existing.code;

  return insertCode({
    kind: "group",
    groupId,
    enrollmentId: null,
    length: GROUP_CODE_LENGTH,
  });
}

/**
 * Replace the shared code for a group (the "regenerate" button). The retired
 * string returns to the pool, which is correct — it is no longer valid anywhere.
 */
export async function rotateGroupCode(groupId: string): Promise<string> {
  await assertTeacherOwnsGroup(groupId);

  await db
    .deleteFrom("classCodes")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .execute();

  return insertCode({
    kind: "group",
    groupId,
    enrollmentId: null,
    length: GROUP_CODE_LENGTH,
  });
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

async function listStudentCodes(groupId: string): Promise<StudentCodeRow[]> {
  return db
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
): Promise<string> {
  await assertTeacherOwnsGroup(groupId);

  const enrollment = await db
    .selectFrom("enrollments")
    .select("id")
    .where("id", "=", enrollmentId)
    .where("groupId", "=", groupId)
    .executeTakeFirst();

  if (!enrollment) {
    throw new Error("That student is not enrolled in this group.");
  }

  await db
    .deleteFrom("classCodes")
    .where("enrollmentId", "=", enrollmentId)
    .execute();

  return insertCode({
    kind: "student",
    groupId,
    enrollmentId,
    length: STUDENT_CODE_LENGTH,
  });
}

/** Convenience wrapper for UIs that only hold a userId. */
export async function issueStudentCodeForUser(
  groupId: string,
  userId: string,
): Promise<string> {
  await assertTeacherOwnsGroup(groupId);

  const enrollment = await db
    .selectFrom("enrollments")
    .select("id")
    .where("groupId", "=", groupId)
    .where("userId", "=", userId)
    .executeTakeFirst();

  if (!enrollment) {
    throw new Error("That student is not enrolled in this group.");
  }

  return issueStudentCode(groupId, enrollment.id);
}

/**
 * Bulk-generate for printing.
 *
 * `onlyMissing: true` (the default) leaves already-issued codes alone so a
 * reprint does not silently invalidate the cards half the class is already
 * holding.
 */
export async function issueStudentCodesForGroup(
  groupId: string,
  { onlyMissing = true }: { onlyMissing?: boolean } = {},
): Promise<StudentCodeRow[]> {
  await assertTeacherOwnsGroup(groupId);

  const students = await listStudentCodes(groupId);
  const results: StudentCodeRow[] = [];

  for (const student of students) {
    if (student.code && onlyMissing) {
      results.push(student);
      continue;
    }
    const code = await issueStudentCode(groupId, student.enrollmentId);
    results.push({ ...student, code });
  }

  return results;
}

export async function revokeStudentCode(
  groupId: string,
  enrollmentId: string,
): Promise<void> {
  await assertTeacherOwnsGroup(groupId);

  await db
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
export async function getGroupCodes(groupId: string): Promise<GroupCodesView> {
  await assertTeacherOwnsGroup(groupId);

  const group = await db
    .selectFrom("groups")
    .select("codeMode")
    .where("id", "=", groupId)
    .executeTakeFirst();

  const groupCode = await db
    .selectFrom("classCodes")
    .select("code")
    .where("groupId", "=", groupId)
    .where("kind", "=", "group")
    .executeTakeFirst();

  return {
    mode: (group?.codeMode as CodeMode | undefined) ?? "shared",
    groupCode: groupCode?.code ?? null,
    students: await listStudentCodes(groupId),
  };
}

import type { Kysely, Transaction } from "kysely";

import {
  STUDENT_CODE_LENGTH,
  generateUniqueCode,
  hashCode,
} from "@/app/lib/codes";
import type { AppDatabase, CodeKind } from "@/db/types";
import { newId, nowIso } from "@/lib/dbValues";

/**
 * Insert a class code WITHOUT an ownership check.
 *
 * The teacher-facing helpers in `@/auth/classCodes` all call
 * `assertTeacherOwnsGroup()`, which reads the current user off the REQUEST
 * context. Two callers have no request:
 *
 *   - `src/scripts/seed.ts`, run through `rw-scripts worker-run`
 *   - `tests/helpers/fixtures.ts`, a plain-Node test harness
 *
 * This is the ONLY place in the codebase allowed to write `classCodes` without
 * an ownership check, and it is deliberately unreachable from `src/app/**` — no
 * route, no `"use server"` module and no component imports it. Keeping the
 * exception in one auditable file is the point of this module existing; the
 * alternative was the same twenty-five lines copied into two places, drifting.
 *
 * ==========================================================================
 * IMPORT CONSTRAINT — this file must stay importable from plain Node.
 *
 * It must NEVER import `@/db`, `@/lib/env`, `@/auth/*`, or anything else that
 * reaches `cloudflare:workers`. The test harness imports it directly from
 * Node, where that specifier does not resolve — and the failure is at IMPORT
 * time, so `withDb()` cannot rescue it. That is exactly why `executor` is a
 * parameter rather than an ambient `db`.
 *
 * Its current dependencies are all safe: `@/app/lib/codes` and
 * `@/lib/dbValues` need nothing but the global `crypto`, and `@/db/types` is
 * type-only.
 * ==========================================================================
 *
 * The `executor` parameter has no default, deliberately. Both call sites
 * already have a handle (a script's `withDb` connection, or the harness's own
 * pool), and requiring it keeps this module honest about having no ambient
 * connection to fall back on.
 */
export async function insertClassCode(
  executor: Kysely<AppDatabase> | Transaction<AppDatabase>,
  params: {
    kind: CodeKind;
    groupId: string;
    /** `null` for a group-wide shared code; an enrollment id for a per-student one. */
    enrollmentId: string | null;
    length?: number;
  },
): Promise<string> {
  const code = await generateUniqueCode({
    length: params.length ?? STUDENT_CODE_LENGTH,
    /*
     * Probes on the SAME executor, so inside a transaction this sees the
     * transaction's own uncommitted rows. Seeding a group code and then five
     * student codes in one transaction would otherwise be able to issue the
     * same code twice.
     */
    isTaken: async (candidate) =>
      Boolean(
        await executor
          .selectFrom("classCodes")
          .select("id")
          .where("codeHash", "=", await hashCode(candidate))
          .executeTakeFirst(),
      ),
  });

  await executor
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
}

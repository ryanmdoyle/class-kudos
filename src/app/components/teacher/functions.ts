"use server";

import { nanoid } from "nanoid";
import { ErrorResponse } from "rwsdk/worker";

import { db } from "@/db";
import { newId, nowIso } from "@/lib/dbValues";
import {
  assertTeacherOwnsGroup,
  ensureGroupCode,
  issueStudentCodesForGroup,
  requireTeacher,
} from "@/auth";
import { loadEnrollmentsWithUser } from "@/app/components/teacher/queries";
import type { EnrollmentWithUser } from "@/app/lib/types";

/**
 * THE TEACHER ACTION BOUNDARY.
 *
 * Every export of a "use server" module is a network-reachable RSC endpoint
 * addressable by action id, and in rwsdk 1.x actions traverse the middleware
 * pipeline — which means the `/teacher` prefix guards in `src/worker.tsx` begin
 * with `if (isAction) return;` and DO NOT protect anything in this file.
 *
 * Therefore EVERY exported function below starts with `requireTeacher()` and,
 * for anything group-scoped, `await assertTeacherOwnsGroup(groupId)`. Where the
 * client only holds a child entity's id (a kudos type, a reward, a redemption)
 * the group is resolved FROM THE DATABASE and then asserted — never taken from
 * the client — so a crafted id cannot reach another teacher's data.
 *
 * Do not `export *` from here, and do not add a helper export that is only meant
 * to be called internally: it would become a public endpoint.
 */

/* -------------------------------------------------------------------------- */
/* Shared result shape                                                         */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = null> = {
  success: boolean;
  error: string | null;
  data?: T;
};

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, error: null, data };
}

function fail(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[teacher action]", message);
  return { success: false, error: message };
}

/* -------------------------------------------------------------------------- */
/* Ownership resolution for child entities                                     */
/*                                                                             */
/* Each of these reads the owning groupId out of the row and asserts on THAT.  */
/* A 404 is thrown for a missing row so a probing teacher cannot tell "not      */
/* yours" from "does not exist".                                               */
/* -------------------------------------------------------------------------- */

async function assertOwnsKudosType(id: string): Promise<string> {
  const row = await db
    .selectFrom("kudosTypes")
    .select("groupId")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) throw new ErrorResponse(404, "Not found");
  await assertTeacherOwnsGroup(row.groupId);
  return row.groupId;
}

async function assertOwnsReward(id: string): Promise<string> {
  const row = await db
    .selectFrom("rewards")
    .select("groupId")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) throw new ErrorResponse(404, "Not found");
  await assertTeacherOwnsGroup(row.groupId);
  return row.groupId;
}

async function assertOwnsLocation(id: string): Promise<string> {
  const row = await db
    .selectFrom("locations")
    .select("groupId")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!row) throw new ErrorResponse(404, "Not found");
  await assertTeacherOwnsGroup(row.groupId);
  return row.groupId;
}

function requiredText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`"${key}" is required.`);
  }
  return value.trim();
}

function requiredInt(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const value = Number(typeof raw === "string" ? raw : NaN);
  if (!Number.isFinite(value)) {
    throw new Error(`"${key}" must be a number.`);
  }
  return Math.trunc(value);
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                      */
/* -------------------------------------------------------------------------- */

/** How many fresh `publicId` nanoids to try before giving up on a collision. */
const PUBLIC_ID_ATTEMPTS = 5;

/**
 * Create a group for the CURRENT teacher.
 *
 * `ownerId` comes from the session, never from the form — otherwise a teacher
 * could create groups inside another teacher's account.
 *
 * A brand-new group starts in "shared" code mode with a shared code already
 * generated, so a teacher can put a code on the board before doing anything
 * else.
 *
 * ==========================================================================
 * THE GROUP AND ITS CODE ARE ONE TRANSACTION.
 *
 * A group without a class code is a group NO STUDENT CAN JOIN, so the INSERT
 * and `ensureGroupCode` commit together or not at all. `ensureGroupCode` is
 * handed the `trx` deliberately: on the ambient `db` it would ask the pool
 * (`max: 1`) for a second connection that this very transaction is holding and
 * the request would HANG, not merely run outside the transaction.
 *
 * `ensureGroupCode` is also the one function in `@/auth` that does not call
 * `assertTeacherOwnsGroup`, precisely so it can be used here — the group row is
 * still uncommitted, so an ownership SELECT would be looking for a row only
 * this transaction can see. `requireTeacher()` above is the check that matters:
 * the group is being created as the requesting teacher.
 *
 * THE RETRY WRAPS THE TRANSACTION, IT IS NOT INSIDE IT. A failed statement
 * aborts the entire Postgres transaction, so a `publicId` collision caught
 * in-place could not be retried — the next statement would die with "current
 * transaction is aborted" and take the group and its code with it.
 *
 * And only the COLLISION is retried. The old loop caught every error and tried
 * five times, so a genuine failure (a not-null violation, a dead connection)
 * was retried pointlessly and then reported as a publicId problem. Anything
 * thrown out of the callback here rolls back and propagates on the first try.
 * ==========================================================================
 */
export async function addGroup(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = requireTeacher();
    const name = requiredText(formData, "name");

    for (let attempt = 0; attempt < PUBLIC_ID_ATTEMPTS; attempt++) {
      const timestamp = nowIso();

      const groupId = await db.transaction().execute(async (trx) => {
        const inserted = await trx
          .insertInto("groups")
          .values({
            id: newId(),
            name,
            description: "",
            ownerId: user.id,
            archived: false,
            rewardedPoints: 0,
            publicId: nanoid(6),
            codeMode: "shared",
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          // `on conflict do nothing` rather than letting the unique violation
          // raise: a raised error would abort the transaction, and we want a
          // retryable "that nanoid was taken" signal instead of a 500.
          //
          // The conflict target is `("publicId")` and NOT a bare `do nothing`.
          // A bare form would swallow a conflict on ANY unique index on
          // `groups` — including the primary key — and silently report an id
          // clash as a publicId clash, burning all five attempts on the wrong
          // problem.
          .onConflict((oc) => oc.column("publicId").doNothing())
          .returning("id")
          .executeTakeFirst();

        // Collision. Returning null COMMITS this transaction, which is normally
        // the trap in this codebase (Kysely rolls back ONLY on a thrown error,
        // so a `return { ok: false }` quietly commits). It is correct here and
        // only here: `do nothing` wrote nothing, so there is an empty
        // transaction to commit and no work to undo. Any path below this line
        // that has to refuse MUST throw instead.
        if (!inserted) return null;

        // Same handle, so this sees the uncommitted group row and rolls back
        // with it if issuing the code fails.
        await ensureGroupCode(inserted.id, trx);

        return inserted.id;
      });

      if (groupId) return ok({ id: groupId });
    }

    throw new Error(
      `Could not create the group: ${PUBLIC_ID_ATTEMPTS} generated public ids ` +
        `all collided with an existing group.`,
    );
  } catch (error) {
    return fail(error);
  }
}

/**
 * Archive (not delete). Everything is kept; the group simply stops appearing on
 * the dashboard and its class codes stop working — `resolveCode()` refuses any
 * code whose group is archived.
 */
export async function archiveGroup(groupId: string): Promise<ActionResult> {
  try {
    await assertTeacherOwnsGroup(groupId);

    await db
      .updateTable("groups")
      .set({ archived: true, updatedAt: nowIso() })
      .where("id", "=", groupId)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Kudos types                                                                 */
/* -------------------------------------------------------------------------- */

export async function addKudoType(formData: FormData): Promise<ActionResult> {
  try {
    const groupId = requiredText(formData, "groupId");
    await assertTeacherOwnsGroup(groupId);

    const name = requiredText(formData, "name");
    const value = requiredInt(formData, "value");

    await db
      .insertInto("kudosTypes")
      .values({ id: newId(), name, value, groupId })
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function editKudoType(formData: FormData): Promise<ActionResult> {
  try {
    requireTeacher();
    const id = requiredText(formData, "id");
    await assertOwnsKudosType(id);

    const name = requiredText(formData, "name");
    const value = requiredInt(formData, "value");

    await db
      .updateTable("kudosTypes")
      .set({ name, value })
      .where("id", "=", id)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteKudoType(id: string): Promise<ActionResult> {
  try {
    requireTeacher();
    await assertOwnsKudosType(id);

    // Awarded `kudos` rows snapshot name and value, so deleting the preset does
    // not rewrite history.
    await db.deleteFrom("kudosTypes").where("id", "=", id).execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Rewards                                                                     */
/* -------------------------------------------------------------------------- */

export async function addReward(formData: FormData): Promise<ActionResult> {
  try {
    const groupId = requiredText(formData, "groupId");
    await assertTeacherOwnsGroup(groupId);

    const name = requiredText(formData, "name");
    const cost = requiredInt(formData, "cost");
    const responseRequired = formData.get("responseRequired") === "on";
    const rawPrompt = formData.get("responsePrompt");
    const responsePrompt =
      typeof rawPrompt === "string" && rawPrompt.trim() !== ""
        ? rawPrompt.trim()
        : null;

    await db
      .insertInto("rewards")
      .values({
        id: newId(),
        name,
        cost,
        responseRequired: responseRequired,
        responsePrompt: responseRequired ? responsePrompt : null,
        groupId,
      })
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function editReward(formData: FormData): Promise<ActionResult> {
  try {
    requireTeacher();
    const id = requiredText(formData, "id");
    await assertOwnsReward(id);

    const name = requiredText(formData, "name");
    const cost = requiredInt(formData, "cost");
    const responseRequired = formData.get("responseRequired") === "on";
    const rawPrompt = formData.get("responsePrompt");
    const responsePrompt =
      typeof rawPrompt === "string" && rawPrompt.trim() !== ""
        ? rawPrompt.trim()
        : null;

    await db
      .updateTable("rewards")
      .set({
        name,
        cost,
        responseRequired: responseRequired,
        responsePrompt: responseRequired ? responsePrompt : null,
      })
      .where("id", "=", id)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteReward(id: string): Promise<ActionResult> {
  try {
    requireTeacher();
    await assertOwnsReward(id);

    // `redeemed` snapshots name and cost, so past redemptions survive this.
    await db.deleteFrom("rewards").where("id", "=", id).execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Awarding kudos                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Award one kudos type to a set of enrollments.
 *
 * The client sends only ids. The NAME and VALUE are read from the kudos type row
 * on the server, so a tampered request cannot award 9999 points, and the
 * enrollment set is re-filtered by `groupId` so ids belonging to another group
 * are silently dropped rather than credited.
 *
 * All three writes are ONE transaction:
 *   1. insert the kudos ledger rows   (the record of what was given)
 *   2. bump enrollment point balances (one atomic `points + value` UPDATE)
 *   3. bump the group's rewardedPoints total (a display counter)
 *
 * They have to be. This is the most-used write in the app, and the ledger is
 * what a teacher points at when a child asks why their total is what it is — so
 * ledger rows whose points were never applied are not "auditable", they are a
 * disagreement between two things the child can see.
 */
export async function awardKudos(
  groupId: string,
  kudosTypeId: string,
  enrollmentIds: string[],
): Promise<ActionResult<{ awarded: number }>> {
  try {
    await assertTeacherOwnsGroup(groupId);

    if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      throw new Error("Select at least one student.");
    }

    const kudosType = await db
      .selectFrom("kudosTypes")
      .select(["id", "name", "value"])
      .where("id", "=", kudosTypeId)
      .where("groupId", "=", groupId)
      .executeTakeFirst();

    if (!kudosType) {
      throw new Error("That kudos type does not belong to this group.");
    }

    // Re-resolve the selection against the database. Never trust the ids.
    const enrollments = await db
      .selectFrom("enrollments")
      .select(["id", "userId"])
      .where("groupId", "=", groupId)
      .where("id", "in", enrollmentIds)
      .execute();

    if (enrollments.length === 0) {
      throw new Error("None of those students are in this group.");
    }

    const createdAt = nowIso();

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto("kudos")
        .values(
          enrollments.map((enrollment) => ({
            id: newId(),
            createdAt,
            name: kudosType.name,
            value: kudosType.value,
            userId: enrollment.userId,
            groupId,
          })),
        )
        .execute();

      await trx
        .updateTable("enrollments")
        .set((eb) => ({ points: eb("points", "+", kudosType.value) }))
        .where("groupId", "=", groupId)
        .where(
          "id",
          "in",
          enrollments.map((enrollment) => enrollment.id),
        )
        .execute();

      await trx
        .updateTable("groups")
        .set((eb) => ({
          rewardedPoints: eb(
            "rewardedPoints",
            "+",
            kudosType.value * enrollments.length,
          ),
          updatedAt: nowIso(),
        }))
        .where("id", "=", groupId)
        .execute();
    });

    return ok({ awarded: enrollments.length });
  } catch (error) {
    return fail(error);
  }
}

/** Re-read the roster after an award so the client can drop its optimistic state. */
export async function getUpdatedEnrollments(
  groupId: string,
): Promise<ActionResult<EnrollmentWithUser[]>> {
  try {
    await assertTeacherOwnsGroup(groupId);
    return ok(await loadEnrollmentsWithUser(groupId));
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Roster                                                                      */
/* -------------------------------------------------------------------------- */

export type NewStudentInput = { firstName: string; lastName: string };

/**
 * Create student user rows and enrol them in one go.
 *
 * v2 students have NO username and NO email — `username` is no longer a
 * credential and students never receive mail. They exist only as a name plus an
 * enrolment, and they get into the app with a class code.
 *
 * If the group is in "individual" code mode the new students immediately get
 * their own codes, so the teacher never has a student who cannot log in.
 */
export async function createNewStudents(
  groupId: string,
  students: NewStudentInput[],
): Promise<ActionResult<{ created: number }>> {
  try {
    await assertTeacherOwnsGroup(groupId);

    const cleaned = (students ?? [])
      .map((student) => ({
        firstName: (student?.firstName ?? "").trim(),
        lastName: (student?.lastName ?? "").trim(),
      }))
      .filter((student) => student.firstName !== "");

    if (cleaned.length === 0) {
      throw new Error("Add at least one student.");
    }

    const timestamp = nowIso();

    const userRows = cleaned.map((student) => ({
      id: newId(),
      username: null,
      email: null,
      firstName: student.firstName,
      lastName: student.lastName,
      role: "STUDENT" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    /*
     * All three writes are ONE transaction, and they have to be. A `users` row
     * without its enrollment is invisible AND unreachable: every teacher-facing
     * query is scoped by `groupId`, and `removeEnrollment` resolves a student
     * only through an enrollment — so an orphan can never be listed, used, or
     * deleted from the UI. It would simply accumulate in the table forever.
     *
     * `issueStudentCodesForGroup` takes the transaction explicitly. Called
     * without it, it would run on the ambient handle — a different connection,
     * outside this transaction — and silently defeat the point.
     */
    await db.transaction().execute(async (trx) => {
      await trx.insertInto("users").values(userRows).execute();

      await trx
        .insertInto("enrollments")
        .values(
          userRows.map((user) => ({
            id: newId(),
            userId: user.id,
            groupId,
            points: 0,
            currentLocationId: null,
            locationUpdatedAt: null,
            createdAt: timestamp,
          })),
        )
        .execute();

      const group = await trx
        .selectFrom("groups")
        .select("codeMode")
        .where("id", "=", groupId)
        .executeTakeFirst();

      if (group?.codeMode === "individual") {
        await issueStudentCodesForGroup(groupId, { onlyMissing: true }, trx);
      }
    });

    return ok({ created: userRows.length });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Rename an enrolled student.
 *
 * Scoped through the enrolment, not the user id: the teacher must own a group
 * this student is enrolled in. Note that the `users` row is shared, so a student
 * who is in two teachers' classes is renamed in both — that is the same single
 * identity behaving consistently, not a leak, but it is worth knowing.
 */
export async function editEnrolled(formData: FormData): Promise<ActionResult> {
  try {
    const groupId = requiredText(formData, "groupId");
    await assertTeacherOwnsGroup(groupId);

    const userId = requiredText(formData, "userId");
    const firstName = requiredText(formData, "firstName");
    const lastName = requiredText(formData, "lastName");

    const enrollment = await db
      .selectFrom("enrollments")
      .select("id")
      .where("groupId", "=", groupId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (!enrollment) throw new ErrorResponse(404, "Not found");

    await db
      .updateTable("users")
      .set({ firstName, lastName, updatedAt: nowIso() })
      .where("id", "=", userId)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Remove a student from a group.
 *
 * If this was their only enrolment the `users` row goes too, so we do not
 * accumulate orphan students that no teacher can see or clean up. Deleting the
 * user cascades to their enrolments, kudos, redemptions, class codes and travel
 * history (verified against the real DO SQLite), so there is no manual cleanup.
 */
export async function removeEnrollment(
  groupId: string,
  enrollmentId: string,
): Promise<ActionResult> {
  try {
    await assertTeacherOwnsGroup(groupId);

    const enrollment = await db
      .selectFrom("enrollments")
      .select(["id", "userId"])
      .where("id", "=", enrollmentId)
      .where("groupId", "=", groupId)
      .executeTakeFirst();

    if (!enrollment) throw new ErrorResponse(404, "Not found");

    const otherEnrollments = await db
      .selectFrom("enrollments")
      .select("id")
      .where("userId", "=", enrollment.userId)
      .where("id", "!=", enrollment.id)
      .execute();

    const user = await db
      .selectFrom("users")
      .select("role")
      .where("id", "=", enrollment.userId)
      .executeTakeFirst();

    if (otherEnrollments.length === 0 && user?.role === "STUDENT") {
      // Cascades: enrollment, classCodes, kudos, redeemed, locationHistory.
      await db.deleteFrom("users").where("id", "=", enrollment.userId).execute();
    } else {
      await db.deleteFrom("enrollments").where("id", "=", enrollment.id).execute();
    }

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Redemptions                                                                 */
/* -------------------------------------------------------------------------- */

export async function approveRedeemed(
  redeemedId: string,
): Promise<ActionResult> {
  try {
    requireTeacher();

    const row = await db
      .selectFrom("redeemed")
      .select(["id", "groupId"])
      .where("id", "=", redeemedId)
      .executeTakeFirst();

    if (!row) throw new ErrorResponse(404, "Not found");
    await assertTeacherOwnsGroup(row.groupId);

    await db
      .updateTable("redeemed")
      .set({ reviewed: true, reviewedAt: nowIso() })
      .where("id", "=", redeemedId)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Cancel a redemption and refund the student's points.
 *
 * The delete and the refund are ONE TRANSACTION. They are the two halves of a
 * single fact — "this reward was never actually taken" — and a database that
 * has done one without the other is a database that has stolen a child's
 * points or minted them for free.
 *
 * `requireTeacher()` and `assertTeacherOwnsGroup()` stay OUTSIDE the
 * transaction on purpose. They are reads that throw before anything is written,
 * so holding a transaction open across them buys no atomicity and only extends
 * how long this request sits on the pool's single connection.
 *
 * THE `DELETE ... RETURNING` COMPARE-AND-SWAP STAYS. It is not made redundant
 * by the transaction and must not be "simplified" into a plain delete now that
 * one exists — the two solve different problems. The transaction makes the pair
 * all-or-nothing; the CAS decides WHO gets to refund. Under READ COMMITTED two
 * concurrent cancels (or one double-click) can both pass the SELECT above; only
 * one of them gets a row back from the DELETE, and the refund is gated on
 * having WON it rather than on the earlier read. That is the cheapest way to be
 * idempotent here without a `SELECT FOR UPDATE`.
 *
 * The shape this replaced was SELECT -> DELETE (unguarded) -> refund, which
 * reads as safe and is not: both callers delete, the second removing zero rows
 * without noticing, and both refund — handing the student a free `cost` worth
 * of points that nothing records.
 */
export async function cancelRedeemed(
  redeemedId: string,
): Promise<ActionResult> {
  try {
    requireTeacher();

    // Authorization must still be checked before we destroy anything.
    const row = await db
      .selectFrom("redeemed")
      .select(["id", "groupId"])
      .where("id", "=", redeemedId)
      .executeTakeFirst();

    if (!row) throw new ErrorResponse(404, "Not found");
    await assertTeacherOwnsGroup(row.groupId);

    await db.transaction().execute(async (trx) => {
      // The CAS. `userId`/`cost` come back from the row we actually removed
      // rather than from the SELECT above, so a cancel that lost the race
      // refunds nothing.
      const deleted = await trx
        .deleteFrom("redeemed")
        .where("id", "=", redeemedId)
        // Re-assert the owning group so the delete cannot be widened by a race
        // that re-pointed the row between the SELECT and here.
        .where("groupId", "=", row.groupId)
        .returning(["id", "userId", "groupId", "cost"])
        .executeTakeFirst();

      // Someone else cancelled it first. Idempotent success — no second refund.
      // Returning here COMMITS (Kysely rolls back only on a thrown error), which
      // is exactly right: the DELETE matched nothing, so there is no write to
      // undo. A refusal that had already written something would have to THROW.
      if (!deleted) return;

      // Refund, on the same handle so it lands with the delete or not at all.
      //
      // `.returning` and the check below are NOT decoration. Postgres does not
      // error on an UPDATE that matches zero rows, so without them the delete
      // would COMMIT with no refund and the action would report success — the
      // exact theft the transaction is here to prevent. This is reachable:
      // `redeemed` has foreign keys to "users" and "groups" but NEVER to
      // "enrollments", so un-enrolling a student leaves their redemption rows
      // behind with no enrollment for the refund to land on.
      const refunded = await trx
        .updateTable("enrollments")
        .set((eb) => ({ points: eb("points", "+", deleted.cost) }))
        .where("userId", "=", deleted.userId)
        .where("groupId", "=", deleted.groupId)
        .returning("id")
        .executeTakeFirst();

      if (!refunded) {
        // THROW, do not return: returning here would commit the delete.
        throw new Error(
          `Cannot cancel: ${deleted.userId} is no longer enrolled in ${deleted.groupId}, ` +
            `so the ${deleted.cost} kudos could not be refunded. Re-enrol the student first.`,
        );
      }
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Locations                                                                   */
/* -------------------------------------------------------------------------- */

export async function addLocation(formData: FormData): Promise<ActionResult> {
  try {
    const groupId = requiredText(formData, "groupId");
    await assertTeacherOwnsGroup(groupId);

    const name = requiredText(formData, "name");
    const rawColor = formData.get("color");
    const color = typeof rawColor === "string" && rawColor ? rawColor : null;
    const rawDescription = formData.get("description");
    const description =
      typeof rawDescription === "string" && rawDescription.trim() !== ""
        ? rawDescription.trim()
        : null;

    const timestamp = nowIso();

    await db
      .insertInto("locations")
      .values({
        id: newId(),
        name,
        description,
        color,
        isActive: true,
        groupId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function editLocation(formData: FormData): Promise<ActionResult> {
  try {
    requireTeacher();
    const id = requiredText(formData, "id");
    await assertOwnsLocation(id);

    const name = requiredText(formData, "name");
    const rawColor = formData.get("color");
    const color = typeof rawColor === "string" && rawColor ? rawColor : null;
    const rawDescription = formData.get("description");
    const description =
      typeof rawDescription === "string" && rawDescription.trim() !== ""
        ? rawDescription.trim()
        : null;

    await db
      .updateTable("locations")
      .set({ name, color, description, updatedAt: nowIso() })
      .where("id", "=", id)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Soft delete. The location is kept so historical `locationHistory` rows still
 * resolve to a name; it simply stops being offered to students. A hard delete
 * would cascade the travel log away.
 */
export async function deleteLocation(id: string): Promise<ActionResult> {
  try {
    requireTeacher();
    const groupId = await assertOwnsLocation(id);

    const now = new Date();

    /*
     * Retiring a location is THREE writes, and the third one is the reason this
     * is a transaction rather than two statements.
     *
     * Sending everyone back to "no location" without closing their open history
     * rows strands those rows permanently: `applyLocationChange` only closes a
     * row when `previousLocationId !== null` (see locationService.ts), and this
     * has just set that to null. Nothing else in the app closes one. The travel
     * log would show a trip that never ends, forever.
     *
     * That is the same locationHistory invariant applyLocationChange was written
     * to protect — it just was not applied here.
     */
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("locations")
        .set({ isActive: false, updatedAt: nowIso() })
        .where("id", "=", id)
        .execute();

      // Close every trip still in progress at this location, BEFORE the link
      // that identifies them is removed below.
      const open = await trx
        .selectFrom("locationHistory")
        .select(["id", "arrivedAt"])
        .where("locationId", "=", id)
        .where("groupId", "=", groupId)
        .where("leftAt", "is", null)
        .execute();

      for (const row of open) {
        // Same computation as applyLocationChange, deliberately: `arrivedAt` is
        // a real Date off a timestamptz, and max(0, …) guards clock skew rather
        // than a parse failure. A retired location holds at most a classroom's
        // worth of open rows, so per-row updates are cheaper than a second
        // convention for the same arithmetic.
        const minutes = Math.max(
          0,
          Math.floor((now.getTime() - row.arrivedAt.getTime()) / 60_000),
        );

        await trx
          .updateTable("locationHistory")
          .set({ leftAt: now, duration: minutes })
          .where("id", "=", row.id)
          .execute();
      }

      // Anyone currently "at" the retired location goes back to no location.
      await trx
        .updateTable("enrollments")
        .set({ currentLocationId: null, locationUpdatedAt: nowIso() })
        .where("currentLocationId", "=", id)
        .execute();
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
}

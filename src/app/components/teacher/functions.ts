"use server";

import { nanoid } from "nanoid";
import { ErrorResponse } from "rwsdk/worker";

import { db } from "@/db";
import { fromBool, newId, nowIso } from "@/lib/sqlite";
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

/**
 * Create a group for the CURRENT teacher.
 *
 * `ownerId` comes from the session, never from the form — otherwise a teacher
 * could create groups inside another teacher's account.
 *
 * A brand-new group starts in "shared" code mode with a shared code already
 * generated, so a teacher can put a code on the board before doing anything
 * else. `publicId` is the nanoid used in the public /travel-log URL and is
 * retried on the (astronomically unlikely) unique-constraint collision.
 */
export async function addGroup(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = requireTeacher();
    const name = requiredText(formData, "name");

    const id = newId();
    const timestamp = nowIso();

    let inserted = false;
    let lastError: unknown;

    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      try {
        await db
          .insertInto("groups")
          .values({
            id,
            name,
            description: "",
            ownerId: user.id,
            archived: fromBool(false),
            rewardedPoints: 0,
            publicId: nanoid(6),
            codeMode: "shared",
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .execute();
        inserted = true;
      } catch (error) {
        lastError = error;
      }
    }

    if (!inserted) {
      throw new Error(`Could not create the group: ${String(lastError)}`);
    }

    // No transactions in rwsdk/db 1.7.0, so this is a second statement. If it
    // fails the group still exists and the Options page will generate the code
    // on demand — the failure mode is "no code yet", not a broken group.
    await ensureGroupCode(id);

    return ok({ id });
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
      .set({ archived: fromBool(true), updatedAt: nowIso() })
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
        responseRequired: fromBool(responseRequired),
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
        responseRequired: fromBool(responseRequired),
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
 * !! NO TRANSACTIONS !! `db.transaction()` throws at runtime in rwsdk/db 1.7.0.
 * This is therefore three statements, ordered so a partial failure is
 * recoverable and visible:
 *   1. insert the kudos ledger rows   (the record of what was given)
 *   2. bump enrollment point balances (one atomic `points + value` UPDATE)
 *   3. bump the group's rewardedPoints total (a display counter only)
 * A failure after (1) leaves ledger rows whose points were not applied — which
 * is auditable — rather than points with no ledger entry.
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

    await db
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

    await db
      .updateTable("enrollments")
      .set((eb) => ({ points: eb("points", "+", kudosType.value) }))
      .where("groupId", "=", groupId)
      .where(
        "id",
        "in",
        enrollments.map((enrollment) => enrollment.id),
      )
      .execute();

    await db
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
      supabaseUserId: null,
      username: null,
      email: null,
      firstName: student.firstName,
      lastName: student.lastName,
      role: "STUDENT",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await db.insertInto("users").values(userRows).execute();

    await db
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

    const group = await db
      .selectFrom("groups")
      .select("codeMode")
      .where("id", "=", groupId)
      .executeTakeFirst();

    if (group?.codeMode === "individual") {
      await issueStudentCodesForGroup(groupId, { onlyMissing: true });
    }

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
      .set({ reviewed: fromBool(true), reviewedAt: nowIso() })
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
 * Two statements, no transaction (unavailable — see the header), so the DELETE
 * itself is made the concurrency control:
 *
 *   1. `DELETE ... RETURNING` — this is a compare-and-swap. Exactly one caller
 *      can ever get a row back for a given redemption id, because SQLite applies
 *      the delete atomically. The refund in step 2 is therefore gated on having
 *      WON the delete, not on a prior SELECT.
 *   2. Refund the points with an atomic `points + cost` expression update.
 *
 * The earlier shape here was SELECT -> DELETE (unguarded) -> refund. That reads
 * as safe but is not: two teachers (or one double-click) both SELECT the row,
 * both DELETE — the second deleting zero rows without noticing — and both
 * refund, minting the child a free `cost` worth of points. Reading the deleted
 * row out of the DELETE closes that window entirely.
 *
 * Residual risk, unavoidable without transactions: the delete succeeds and the
 * refund throws, which LOSES the student their points. That is visible and a
 * teacher can re-award; the reverse ordering would silently mint points, which
 * is not correctable because nothing records that it happened.
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

    // Step 1 — the CAS. `userId`/`cost` are read back from the row we actually
    // removed rather than from the SELECT above, so a concurrent cancel that
    // lost the race refunds nothing.
    const deleted = await db
      .deleteFrom("redeemed")
      .where("id", "=", redeemedId)
      // Re-assert the owning group so the delete cannot be widened by a race
      // that re-pointed the row between the SELECT and here.
      .where("groupId", "=", row.groupId)
      .returning(["id", "userId", "groupId", "cost"])
      .executeTakeFirst();

    // Someone else cancelled it first. Idempotent success — no second refund.
    if (!deleted) return ok();

    // Step 2 — refund, atomically.
    await db
      .updateTable("enrollments")
      .set((eb) => ({ points: eb("points", "+", deleted.cost) }))
      .where("userId", "=", deleted.userId)
      .where("groupId", "=", deleted.groupId)
      .execute();

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
        isActive: fromBool(true),
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
    await assertOwnsLocation(id);

    await db
      .updateTable("locations")
      .set({ isActive: fromBool(false), updatedAt: nowIso() })
      .where("id", "=", id)
      .execute();

    // Anyone currently "at" the retired location goes back to no location.
    await db
      .updateTable("enrollments")
      .set({ currentLocationId: null, locationUpdatedAt: nowIso() })
      .where("currentLocationId", "=", id)
      .execute();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

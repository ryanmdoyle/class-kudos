import { describe, expect, it } from "vitest";

import { actionId, allActionIds, allActionModules } from "../helpers/actions";

/**
 * The app's network-reachable surface, pinned.
 *
 * ==========================================================================
 * READ THIS BEFORE UPDATING THE GOLDEN LIST BELOW.
 *
 * EVERY export of a `"use server"` module is a PUBLIC HTTP ENDPOINT. rwsdk turns
 * it into a server reference that anyone can POST to at
 * `?__rsc_action_id=<module>#<export>` — from any page path, with any arguments,
 * with or without a session. There is no framework-level authorization in front
 * of it: STACK.md §3 trap 3 spells out that RSC actions traverse global
 * middleware, so middleware is NOT a boundary and each action must call its own
 * `requireTeacher()` / `requireStudent()` / `assertTeacherOwnsGroup()`.
 *
 * So a diff in this file is never cosmetic. It means the attack surface changed,
 * and the change is only finished when the new endpoint has a matching row in the
 * authorization sweep proving it refuses an anonymous caller, a foreign teacher
 * and a student. Adding the name here to make the test green — without that row —
 * is precisely the mistake this test exists to prevent.
 * ==========================================================================
 */

/** The five `"use server"` modules. STACK.md §1: "exactly 5 in the whole repo". */
const GOLDEN_MODULES = [
  "/src/app/components/public/functions.ts",
  "/src/app/components/student/functions.ts",
  "/src/app/components/teacher/functions.ts",
  "/src/app/components/teacher/options/functions.ts",
  "/src/app/pages/user/functions.ts",
] as const;

/** 9 — the pre-authentication boundary, hand-enumerated in the module itself. */
const USER_ACTIONS = [
  "teacherLogin",
  "studentCodeLogin",
  "studentPickName",
  "loadPendingGroup",
  "logout",
  "sendPasswordReset",
  "finishPasswordReset",
  "teacherSignup",
  "finishTeacherSignup",
] as const;

/** 2 — the only actions a student session may call. Guards sit OUTSIDE the try. */
const STUDENT_ACTIONS = ["requestReward", "setMyLocation"] as const;

/** 1 — anonymous, by design: the classroom travel board on a shared display. */
const PUBLIC_ACTIONS = ["updateTravelLocation"] as const;

/** 18 — the teacher console. Every one needs requireTeacher + group ownership. */
const TEACHER_ACTIONS = [
  "addGroup",
  "archiveGroup",
  "addKudoType",
  "editKudoType",
  "deleteKudoType",
  "addReward",
  "editReward",
  "deleteReward",
  "awardKudos",
  "getUpdatedEnrollments",
  "createNewStudents",
  "editEnrolled",
  "removeEnrollment",
  "approveRedeemed",
  "cancelRedeemed",
  "addLocation",
  "editLocation",
  "deleteLocation",
] as const;

/** 5 — class-code issuing and rotation, split out of the teacher module. */
const TEACHER_OPTIONS_ACTIONS = [
  "setCodeMode",
  "ensureSharedCode",
  "regenerateSharedCode",
  "generateStudentCodes",
  "resetStudentCode",
] as const;

const GOLDEN_IDS = [
  ...USER_ACTIONS.map((n) => `/src/app/pages/user/functions.ts#${n}`),
  ...STUDENT_ACTIONS.map((n) => `/src/app/components/student/functions.ts#${n}`),
  ...PUBLIC_ACTIONS.map((n) => `/src/app/components/public/functions.ts#${n}`),
  ...TEACHER_ACTIONS.map((n) => `/src/app/components/teacher/functions.ts#${n}`),
  ...TEACHER_OPTIONS_ACTIONS.map(
    (n) => `/src/app/components/teacher/options/functions.ts#${n}`,
  ),
].sort();

describe("the \"use server\" module set", () => {
  it("is exactly the five documented modules", () => {
    expect(allActionModules().map((m) => m.modulePath)).toEqual([
      ...GOLDEN_MODULES,
    ]);
  });

  /*
   * `src/auth/provision.ts` holds the SERVICE-ROLE key — it can create and edit
   * any auth user in the project. It is operator-only and must never be imported
   * from `src/app/**`. A single stray `"use server"` at the top of it would make
   * `auth.admin.createUser` callable over HTTP by anyone. Nothing else in the repo
   * would complain; this assertion is the tripwire.
   */
  it("does not include src/auth/provision.ts or anything else outside src/app", () => {
    const paths = allActionModules().map((m) => m.modulePath);
    expect(paths).not.toContain("/src/auth/provision.ts");
    expect(paths.filter((p) => !p.startsWith("/src/app/"))).toEqual([]);
  });

  it("exports exactly the 35 golden action names, per module", () => {
    const byPath = new Map(
      allActionModules().map((m) => [m.modulePath, m.exports]),
    );

    expect(byPath.get("/src/app/pages/user/functions.ts")).toEqual([
      ...USER_ACTIONS,
    ]);
    expect(byPath.get("/src/app/components/student/functions.ts")).toEqual([
      ...STUDENT_ACTIONS,
    ]);
    expect(byPath.get("/src/app/components/public/functions.ts")).toEqual([
      ...PUBLIC_ACTIONS,
    ]);
    expect(byPath.get("/src/app/components/teacher/functions.ts")).toEqual([
      ...TEACHER_ACTIONS,
    ]);
    expect(
      byPath.get("/src/app/components/teacher/options/functions.ts"),
    ).toEqual([...TEACHER_OPTIONS_ACTIONS]);
  });

  it("has 35 endpoints in total, and allActionIds() agrees", () => {
    expect(GOLDEN_IDS).toHaveLength(35);
    expect(allActionIds()).toEqual(GOLDEN_IDS);
  });

  /*
   * `actionId(name)` is what every integration test uses to address an action, so
   * a name exported by two modules would make it ambiguous — the helper refuses
   * to guess in that case, but a test that expected the other module would then
   * fail confusingly. Keeping the names globally unique keeps the short form safe.
   */
  it("has no export-name collisions across modules", () => {
    const names = allActionModules().flatMap((m) => m.exports);
    expect(names).toHaveLength(new Set(names).size);
    expect(names).toHaveLength(35);
  });
});

describe("actionId", () => {
  it("builds the exact id rwsdk's loader splits on", () => {
    expect(actionId("teacherLogin")).toBe(
      "/src/app/pages/user/functions.ts#teacherLogin",
    );
    expect(actionId("requestReward")).toBe(
      "/src/app/components/student/functions.ts#requestReward",
    );
    expect(actionId("resetStudentCode")).toBe(
      "/src/app/components/teacher/options/functions.ts#resetStudentCode",
    );
  });

  it("resolves every golden name to its golden id", () => {
    const byName = new Map(
      GOLDEN_IDS.map((id) => [id.slice(id.indexOf("#") + 1), id]),
    );
    for (const [name, id] of byName) {
      expect(actionId(name), name).toBe(id);
    }
  });

  /*
   * A typo'd action name must fail with the list of real ones. Reaching the server
   * with a wrong id instead produces a 404 whose action ALSO ran nothing — a very
   * quiet way to write a test that asserts nothing.
   */
  it("throws with the known names listed when the name is unknown", () => {
    let message = "";
    try {
      actionId("teacherLogn");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('No "use server" export named "teacherLogn"');
    expect(message).toContain("Known actions:");
    expect(message).toContain("teacherLogin");
    expect(message).toContain("updateTravelLocation");
  });
});

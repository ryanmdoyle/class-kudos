import { route } from "rwsdk/router";

import { Student } from "@/app/pages/student/Student";
import { StudentGroup } from "@/app/pages/student/StudentGroup";
import { StudentRewards } from "@/app/pages/student/StudentRewards";

/**
 * ROUTE WIRING IS FINAL — mounted under prefix("/student", [...]) in
 * src/worker.tsx behind `isAuthenticated` and `checkRoleAccess`.
 *
 * That middleware is SKIPPED for RSC actions. Every student server action must
 * therefore start with `requireStudent()` and, for anything scoped to a group,
 * `await assertStudentEnrolled(groupId)`.
 */
export const studentRoutes = [
  route("/", [Student]),
  route("/:groupId", [StudentGroup]),
  route("/:groupId/rewards", [StudentRewards]),
];

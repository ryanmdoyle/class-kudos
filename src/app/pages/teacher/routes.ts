import { route } from "rwsdk/router";

import { Teacher } from "@/app/pages/teacher/Teacher";
import { Group } from "@/app/pages/teacher/Group";
import { Rewards } from "@/app/pages/teacher/Rewards";
import { Options } from "@/app/pages/teacher/Options";
import { TravelLog } from "@/app/pages/teacher/TravelLog";

/**
 * ROUTE WIRING IS FINAL — mounted under prefix("/teacher", [...]) in
 * src/worker.tsx behind `isAuthenticated` and `checkRoleAccess`.
 *
 * That middleware is SKIPPED for RSC actions. Every teacher server action must
 * therefore start with `requireTeacher()` and, for anything scoped to a group,
 * `await assertTeacherOwnsGroup(groupId)`.
 */
export const teacherRoutes = [
  route("/", [Teacher]),
  route("/:groupId", [Group]),
  route("/:groupId/rewards", [Rewards]),
  route("/:groupId/options", [Options]),
  route("/:groupId/travel-log", [TravelLog]),
];

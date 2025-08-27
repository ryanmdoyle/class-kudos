import { route } from "rwsdk/router";
import { Teacher } from "./Teacher";
import { Group } from "./Group";
import { Rewards } from "./Rewards";
import { Options } from "./Options";
import { TravelLog } from "./TravelLog";

export const teacherRoutes = [
  route("/", [Teacher]),
  route("/:groupId", [Group]),
  route("/:groupId/rewards", [Rewards]),
  route("/:groupId/options", [Options]),
  route("/:groupId/travel-log", [TravelLog]),
];

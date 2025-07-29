import { route } from "rwsdk/router";
import { Student } from "./Student";
import { StudentGroup } from "./StudentGroup";
import { StudentRewards } from "./StudentRewards";


export const studentRoutes = [
  route("/", [Student]),
  route("/:groupId", [StudentGroup]),
  route("/:groupId/rewards", [StudentRewards]),
];

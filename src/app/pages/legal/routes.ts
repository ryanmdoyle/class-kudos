import { route } from "rwsdk/router";
import { Privacy } from "./Privacy";
import { Terms } from "./Terms";

export const legalRoutes = [
  route("/privacy", [Privacy]),
  route("/terms", [Terms])
];

import { route } from "rwsdk/router";
import { Privacy } from "./privacy";
import { Terms } from "./Terms";

export const legalRoutes = [
  route("/privacy", [Privacy]),
  route("/terms", [Terms])
];

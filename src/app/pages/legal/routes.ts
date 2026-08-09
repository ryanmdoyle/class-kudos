import { route } from "rwsdk/router";

import { Privacy } from "@/app/pages/legal/Privacy";
import { Terms } from "@/app/pages/legal/Terms";

/** ROUTE WIRING IS FINAL — mounted under prefix("/legal", ...). Public. */
export const legalRoutes = [
  route("/privacy", [Privacy]),
  route("/terms", [Terms]),
];

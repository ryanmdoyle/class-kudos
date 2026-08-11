import { route } from "rwsdk/router";

import { Locations } from "@/app/pages/public/Locations";

/**
 * ROUTE WIRING IS FINAL.
 *
 * Spread into the top-level route list in src/worker.tsx (NOT under a prefix),
 * because `/travel-log/:groupPublicId` is a bare public path with no auth
 * middleware in front of it.
 */
export const publicRoutes = [
  route("/travel-log/:groupPublicId", [Locations]),
];

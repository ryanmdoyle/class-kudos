import { defineLinks } from "rwsdk/router";

/**
 * Typed link builder. Keep in sync with the per-area `routes.ts` modules under
 * `src/app/pages` — this list is the source of truth for `link()`.
 */
export const link = defineLinks([
  "/",
  // `/user` is `index(Login)` in src/app/pages/user/routes.ts.
  "/user",
  "/user/login",
  "/user/logout",
  "/user/reset-password",
  "/user/confirm",
  "/teacher",
  "/teacher/:groupId",
  "/teacher/:groupId/rewards",
  "/teacher/:groupId/options",
  "/teacher/:groupId/travel-log",
  "/student",
  "/student/:groupId",
  "/student/:groupId/rewards",
  "/legal/privacy",
  "/legal/terms",
  "/travel-log/:groupPublicId",
]);

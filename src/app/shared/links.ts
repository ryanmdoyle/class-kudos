import { defineLinks } from "rwsdk/router";

export const link = defineLinks([
  "/",
  "/user/signup",
  "/user/login",
  "/user/logout",
  "/user/request-passkey",
  "/user/teacher-reset",
  "/teacher",
  "/teacher/:groupId",
  "/teacher/:groupId/rewards",
  "/teacher/:groupId/options",
  "/student",
  "/student/:groupId",
  "/student/:groupId/rewards",
  "/legal/privacy",
  "/legal/terms",
]);

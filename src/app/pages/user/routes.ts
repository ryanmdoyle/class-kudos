import { index, route } from "rwsdk/router";
import { Login } from "./Login";
import { Signup } from "./Signup";
import { RequestPasskey } from "./RequestPasskey";
import { ResetTeacherPasskey } from "./ResetTeacherPasskey";
import { WhatArePasskeys } from "./WhatArePasskeys";
import { sessions } from "@/session/store";

export const userRoutes = [
  index(Login), //fallback
  route("/login", [Login]),
  route("/signup", [Signup]),
  route("/request-passkey", [RequestPasskey]),
  route("/teacher-reset/:code", [ResetTeacherPasskey]),
  route("/what-are-passkeys", [WhatArePasskeys]),
  route("/logout", async function ({ request }) {
    const headers = new Headers();
    await sessions.remove(request, headers);
    headers.set("Location", "/");

    return new Response(null, {
      status: 302,
      headers,
    });
  }),
];

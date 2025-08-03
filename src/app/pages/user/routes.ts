import { route } from "rwsdk/router";
import { Login } from "./Login";
import { Signup } from "./Signup";
import { Email } from "./Email";
import { LostPasskey } from "./LostPasskey";
import { ResetTeacherPasskey } from "./ResetTeacherPasskey";
import { sessions } from "@/session/store";

export const userRoutes = [
  route("/login", [Login]),
  route("/signup", [Signup]),
  route("/email", [Email]),
  route("/lost-passkey", [LostPasskey]),
  route("/teacher-reset/:code", [ResetTeacherPasskey]),
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

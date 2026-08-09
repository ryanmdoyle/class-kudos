import { index, route } from "rwsdk/router";

import { Login } from "@/app/pages/user/Login";
import { ResetPassword } from "@/app/pages/user/ResetPassword";
import { logoutUser } from "@/auth/context";

/**
 * ROUTE WIRING IS FINAL. Feature agents replace page bodies, not this file.
 *
 * The WebAuthn pages (Signup, RequestPasskey, ResetTeacherPasskey,
 * WhatArePasskeys) are gone: teachers use Supabase email+password and students
 * use a class code. There is no self-signup — teachers are provisioned by
 * `npm run seed`.
 */
export const userRoutes = [
  index(Login),
  route("/login", [Login]),
  // Supabase's reset email redirects here. Keep the path in sync with
  // PASSWORD_RESET_PATH in @/auth and with the Supabase dashboard allow-list.
  route("/reset-password", [ResetPassword]),
  route("/logout", async () => {
    // logoutUser() writes Set-Cookie to requestInfo.response.headers, which the
    // framework merges into whatever we return here.
    const { redirectTo } = await logoutUser();
    return new Response(null, { status: 302, headers: { Location: redirectTo } });
  }),
];

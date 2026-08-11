import { index, route } from "rwsdk/router";

import { ConfirmSignup } from "@/app/pages/user/ConfirmSignup";
import { Login } from "@/app/pages/user/Login";
import { ResetPassword } from "@/app/pages/user/ResetPassword";
import { logoutUser } from "@/auth/context";

/**
 * The WebAuthn pages (Signup, RequestPasskey, ResetTeacherPasskey,
 * WhatArePasskeys) are gone: teachers use Supabase email+password and students
 * use a class code.
 *
 * Every route here is PRE-AUTHENTICATION — the `/user` prefix carries no
 * `isAuthenticated` middleware, by design. Anything added here is reachable by
 * anyone on the internet, so it must defend itself.
 */
export const userRoutes = [
  index(Login),
  route("/login", [Login]),
  // Supabase's reset email redirects here. Keep the path in sync with
  // PASSWORD_RESET_PATH in @/auth and with the Supabase dashboard allow-list.
  route("/reset-password", [ResetPassword]),
  // Supabase's signup confirmation email redirects here. Keep in sync with
  // SIGNUP_CONFIRM_PATH in @/auth and the dashboard allow-list. The page only
  // READS the token; it is verified when the password form is submitted, so a
  // mail scanner prefetching this URL cannot burn the link.
  route("/confirm", [ConfirmSignup]),
  route("/logout", async () => {
    // logoutUser() writes Set-Cookie to requestInfo.response.headers, which the
    // framework merges into whatever we return here.
    const { redirectTo } = await logoutUser();
    return new Response(null, { status: 302, headers: { Location: redirectTo } });
  }),
];

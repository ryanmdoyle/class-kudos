import type { RequestInfo } from "rwsdk/worker";

import { AuthLayout } from "@/app/layouts/AuthLayout";
import { Button } from "@/app/components/ui/button";
import { LoginPanel } from "@/app/pages/user/LoginPanel";
import { link } from "@/app/shared/links";
import { getPendingGroupRoster } from "@/auth";
import { isTeacherRole } from "@/auth/types";

/**
 * The one and only sign-in page. Rendered at BOTH "/" and "/user/login".
 *
 * Layout priority is deliberate and is the whole point of this page: the class
 * code is the primary control, because the overwhelming majority of logins are
 * children copying a six-character code off a printed card. The teacher
 * email/password form is the second of two tabs — teachers sign in a few times
 * a day, students sign in thirty at a time.
 *
 * This is a SERVER component. It resolves the half-finished "shared group code"
 * state up front so that a refresh in the middle of the two-step group-code
 * login re-renders the roster picker directly, instead of flashing the code
 * form and then swapping. The interactive parts live in <LoginPanel />.
 */
export async function Login({ ctx, request }: RequestInfo) {
  // "/" has `routeToDashboardByRoleOnLogin` in front of it, so only
  // "/user/login" can be reached with a live session. Don't show a sign-in form
  // to somebody who is already signed in — it just looks broken.
  if (ctx.user) {
    const dashboard = isTeacherRole(ctx.user.role)
      ? link("/teacher")
      : link("/student");

    return (
      <AuthLayout>
        <div className="auth-form mx-auto w-full max-w-[520px] px-8 sm:px-10">
          <h1 className="mb-2 text-center text-3xl">
            You&rsquo;re already signed in
          </h1>
          <p className="mb-6">
            Signed in as {ctx.user.firstName} {ctx.user.lastName}.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <a href={dashboard}>Go to my dashboard</a>
            </Button>
            <Button asChild variant="neutral" className="w-full">
              <a href={link("/user/logout")}>Sign out</a>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Non-null only when a valid shared group code was entered in the last 10
  // minutes and the visitor has not yet picked their name. Resolving it here,
  // rather than from an effect in the browser, is what makes step two survive a
  // refresh without first flashing the code form.
  //
  // The `pendingGroupId` guard matters: `getPendingGroupRoster()` re-loads the
  // session, which is a Durable Object round trip. `attachAuth` has already put
  // the session on `ctx`, so checking it first keeps the ordinary login page —
  // by far the common case — down to zero extra DO calls.
  const pendingGroup = ctx.session?.pendingGroupId
    ? await getPendingGroupRoster()
    : null;

  // `/user/confirm` bounces here when a signup confirmation link is unusable,
  // so the Teacher tab can explain it rather than leaving a dead end.
  const confirmProblem =
    new URL(request.url).searchParams.get("confirm") === "invalid";

  return (
    <AuthLayout>
      <LoginPanel pendingGroup={pendingGroup} confirmProblem={confirmProblem} />
    </AuthLayout>
  );
}

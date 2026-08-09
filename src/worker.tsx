import * as Sentry from "@sentry/cloudflare";
import { defineApp } from "rwsdk/worker";
import type { RequestInfo } from "rwsdk/worker";
import { prefix, render, route } from "rwsdk/router";

import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { loadAuthContext } from "@/auth/context";
import { isTeacherRole, type AuthContext } from "@/auth/types";

import { Login } from "@/app/pages/user/Login";
import { userRoutes } from "@/app/pages/user/routes";
import { legalRoutes } from "@/app/pages/legal/routes";
import { publicRoutes } from "@/app/pages/public/routes";
import { studentRoutes } from "@/app/pages/student/routes";
import { teacherRoutes } from "@/app/pages/teacher/routes";

/**
 * Durable Object classes MUST be exported from the worker entry point, or
 * workerd cannot instantiate them. Both are declared in wrangler.jsonc under
 * `durable_objects.bindings` and `migrations[].new_sqlite_classes`.
 */
export { Database } from "@/db/durableObject";
export { SessionDurableObject } from "@/session/durableObject";

/**
 * `types/rw.d.ts` augments rwsdk's `DefaultAppContext` from this type, which is
 * what makes `ctx` typed in every route, page and middleware WITHOUT importing
 * anything. Do not import AppContext by hand in pages — just use `ctx`.
 */
export type AppContext = AuthContext;

/* -------------------------------------------------------------------------- */
/* Middleware                                                                  */
/*                                                                             */
/* !! THE ONE RULE !!                                                          */
/*   Every middleware that can return a Response MUST begin with               */
/*       if (isAction) return;                                                 */
/*                                                                             */
/* In rwsdk 1.x, RSC actions POST to the CURRENT page URL plus                 */
/* `?__rsc_action_id=...`, and they traverse BOTH the global middleware chain   */
/* AND the prefix()/route() middleware of that page before `handleAction()`     */
/* runs. Any Response returned by a middleware short-circuits the request and   */
/* the action never executes — the browser receives an HTML 302/403 where it    */
/* expects an RSC payload.                                                     */
/*                                                                             */
/* The corollary is important: middleware is NO LONGER an authorization        */
/* boundary for actions. Every server action must call requireUser() /         */
/* requireTeacher() / requireStudent() / assertTeacherOwnsGroup() itself.      */
/*                                                                             */
/* Read `isAction` from the middleware ARGUMENT (as below) or from             */
/* `getRequestInfo()`. NEVER from the imported `requestInfo` proxy — that proxy */
/* is built from a fixed key list that does not include `isAction`, so it is    */
/* always `undefined` there and the guard silently does nothing.                */
/* -------------------------------------------------------------------------- */

/**
 * Global: resolve the session cookie into `ctx.session` / `ctx.user`.
 *
 * Never redirects, and is therefore safe for actions without an `isAction`
 * guard. A bad/forged/expired cookie is self-healed (cleared) and the request
 * simply continues anonymously.
 */
const attachAuth = async ({ ctx, request }: RequestInfo) => {
  const { session, user } = await loadAuthContext(request);
  ctx.session = session;
  ctx.user = user;
};

/**
 * Anonymous visitors are sent to the login page.
 *
 * Mounted ONLY under /student and /teacher — "/" deliberately has no
 * `isAuthenticated`, which is why rejecting actions here cannot break the login
 * action (that one is fired from "/").
 *
 * An action must NOT fall through to the page when there is no user. Returning
 * early here used to let the action run, after which rwsdk re-renders the page;
 * the page's `requireTeacher()`/`requireStudent()` then throws `ErrorResponse`
 * *inside* the RSC stream, which never terminates — the Workers runtime detects
 * the hang and 500s after ~30s. That is reachable in normal use: any open tab
 * whose session expires 500s on the next button click. Fail the action outright
 * instead, with a status the client can act on.
 */
const isAuthenticated = ({ ctx, isAction }: RequestInfo) => {
  if (!ctx.user) {
    if (isAction) {
      return new Response("You need to sign in to do that.", { status: 401 });
    }
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }
};

/**
 * "/" is the login page. A visitor who already has a session is bounced to their
 * dashboard instead of being shown the login form again.
 *
 * The `isAction` guard is load-bearing here specifically: the login action is
 * fired FROM "/", so without it a successful login would 302 its own action.
 */
const routeToDashboardByRoleOnLogin = ({ ctx, isAction }: RequestInfo) => {
  if (isAction) return;
  if (!ctx.user) return;

  return new Response(null, {
    status: 302,
    headers: { Location: isTeacherRole(ctx.user.role) ? "/teacher" : "/student" },
  });
};

/**
 * Students are blocked from /teacher, teachers and admins from /student.
 *
 * Wrong-role actions are rejected here for the same reason as
 * `isAuthenticated`: letting them through means the page re-render throws
 * inside the RSC stream and hangs the worker. A 403 is correct for both a
 * document request and an action, so no `isAction` branch is needed.
 */
const checkRoleAccess = ({ ctx, request }: RequestInfo) => {
  if (!ctx.user) return;

  const { pathname } = new URL(request.url);

  if (ctx.user.role === "STUDENT" && pathname.startsWith("/teacher")) {
    return new Response("Forbidden", { status: 403 });
  }

  if (isTeacherRole(ctx.user.role) && pathname.startsWith("/student")) {
    return new Response("Forbidden", { status: 403 });
  }
};

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const app = defineApp([
  setCommonHeaders(),
  attachAuth,
  render(Document, [
    // "/" IS the login page — deliberately no `isAuthenticated` here.
    route("/", [routeToDashboardByRoleOnLogin, Login]),

    prefix("/user", userRoutes),
    prefix("/legal", legalRoutes),

    // Public, unauthenticated: a classroom display board keyed by group publicId.
    ...publicRoutes,

    prefix("/student", [isAuthenticated, checkRoleAccess, studentRoutes]),
    prefix("/teacher", [isAuthenticated, checkRoleAccess, teacherRoutes]),
  ]),
]);

/**
 * Sentry wraps the exported handler. `optionsCallback` returning `undefined`
 * disables the SDK entirely, which is what we want when SENTRY_DSN is unset —
 * local development should not need a DSN.
 *
 * The cast keeps `__rwRoutes` on the exported type so `types/rw.d.ts`'s
 * `App` type (and therefore `defineLinks<App>()`) still sees the route table.
 * `withSentry` returns the same object with `fetch` instrumented.
 */
export default Sentry.withSentry(
  (env: Env) => {
    // SENTRY_DSN is a secret, so it is not reliably present in the `Env` type
    // that `wrangler types` generates. One narrow read rather than a hard
    // dependency on codegen having seen it.
    const dsn = (env as unknown as { SENTRY_DSN?: string }).SENTRY_DSN;
    return dsn ? { dsn, sendDefaultPii: true } : undefined;
  },
  { fetch: app.fetch },
) as unknown as typeof app;

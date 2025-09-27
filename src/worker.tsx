import * as Sentry from "@sentry/cloudflare"
import { defineApp, ErrorResponse } from "rwsdk/worker";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import { Login } from "@/app/pages/user/Login"
import { Locations } from "@/app/pages/public/Locations"
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { legalRoutes } from "@/app/pages/legal/routes";
import { teacherRoutes } from "@/app/pages/teacher/routes";
import { studentRoutes } from "@/app/pages/student/routes";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { type User, db, setupDb } from "@/db";
import { env } from "cloudflare:workers";
export { SessionDurableObject } from "./session/durableObject";


export type AppContext = {
  session: Session | null;
  user: User | null;
};

const isAuthenticated = ({ ctx }: { ctx: AppContext }) => {
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/user/login" },
    });
  }
}

const routeToDashboardByRoleOnLogin = ({ ctx }: { ctx: AppContext }) => {
  if (ctx.user && ctx.user.role === "TEACHER") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/teacher" },
    });
  }
  if (ctx.user && ctx.user.role === "STUDENT") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/student" },
    });
  }
}

const checkRoleAccess = ({ ctx, request }: { ctx: AppContext; request: Request }) => {
  if (!ctx.user) return;

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (ctx.user.role === "TEACHER" && pathname.startsWith("/student")) {
    return new Response("Forbidden", { status: 403 });
  }

  if (ctx.user.role === "STUDENT" && pathname.startsWith("/teacher")) {
    return new Response("Forbidden", { status: 403 });
  }
};

const app = defineApp([
  setCommonHeaders(),
  async ({ ctx, request, headers }) => {
    await setupDb(env);
    setupSessionStore(env);

    try {
      ctx.session = await sessions.load(request);
    } catch (error) {
      if (error instanceof ErrorResponse && error.code === 401) {
        await sessions.remove(request, headers);
        headers.set("Location", "/user/login");

        return new Response(null, {
          status: 302,
          headers,
        });
      }

      throw error;
    }

    if (ctx.session?.userId) {
      ctx.user = await db.user.findUnique({
        where: {
          id: ctx.session.userId,
        },
      });
    }
  },
  render(Document, [
    route("/", [isAuthenticated, routeToDashboardByRoleOnLogin, Login]),
    prefix("/legal", legalRoutes),
    route("/travel-log/:groupPublicId", [Locations]),
    prefix("/user", userRoutes),
    prefix("/student", [isAuthenticated, checkRoleAccess, studentRoutes]),
    prefix("/teacher", [isAuthenticated, checkRoleAccess, teacherRoutes]),
  ]),
]);

export default Sentry.withSentry(
  env => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: true,
  }),
  {
    fetch: app.fetch,
  }
)
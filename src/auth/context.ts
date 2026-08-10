import "server-only";

import { ErrorResponse, getRequestInfo } from "rwsdk/worker";
import type { Kysely, Transaction } from "kysely";

import { db, type AppDatabase, type UserRole } from "@/db";
import { sessions } from "@/session/store";
import type { Session, SessionInput } from "@/session/durableObject";
import {
  isTeacherRole,
  type AuthContext,
  type AuthUser,
} from "@/auth/types";

/**
 * NOT a "use server" module.
 *
 * Every exported function of a "use server" module becomes a network-reachable
 * RSC action addressable by id. These helpers (and everything else under
 * `src/auth/`) are a plain server-side library. The ONLY "use server" file in
 * the auth system is `src/app/pages/user/functions.ts`, which wraps the small
 * set of genuinely public entry points by hand.
 */

const AUTH_USER_COLUMNS = [
  "id",
  "username",
  "email",
  "firstName",
  "lastName",
  "role",
] as const;

type UserRowProjection = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
};

function toAuthUser(row: UserRowProjection): AuthUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
  };
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const row = await db
    .selectFrom("users")
    .select(AUTH_USER_COLUMNS)
    .where("id", "=", id)
    .executeTakeFirst();

  return row ? toAuthUser(row) : null;
}

/**
 * Look up the local row for a Supabase auth user.
 *
 * `users.id` IS the `auth.users.id` for teachers and admins, so this is just
 * `findAuthUserById` — kept as a named alias because the CALL SITES mean
 * something specific by it: "I hold a Supabase user id, give me the local row."
 * That equality is the auth model, and naming it here is where a reader learns
 * it.
 */
export const findAuthUserBySupabaseId = findAuthUserById;

/**
 * Load session + user for the global worker middleware.
 *
 * Critically this NEVER returns a redirect. The legacy 0.x version caught
 * ErrorResponse(401) and 302'd to the login page; in 1.x that would ALSO
 * intercept RSC actions (they now traverse the middleware pipeline) and hand the
 * browser an HTML redirect where it expects an RSC payload. Instead a bad or
 * forged cookie is self-healed here: the cookie is cleared and the request
 * simply continues as anonymous. Route-level middleware decides what to do about
 * anonymity, and does so `isAction`-aware.
 */
export async function loadAuthContext(request: Request): Promise<AuthContext> {
  const { response } = getRequestInfo();

  let session: Session | null = null;

  try {
    session = await sessions.load(request);
  } catch (error) {
    if (error instanceof ErrorResponse && error.code === 401) {
      // Invalid / tampered / expired session id. Clear it, continue anonymously.
      await sessions.remove(request, response.headers);
      return { session: null, user: null };
    }
    throw error;
  }

  // A session carrying only `pendingGroupId` is NOT authentication. It is a
  // half-finished group-code login and must not populate ctx.user.
  if (!session?.userId) {
    return { session, user: null };
  }

  const user = await findAuthUserById(session.userId);

  if (!user) {
    // The user row was deleted underneath a live session. Revoke it.
    await sessions.remove(request, response.headers);
    return { session: null, user: null };
  }

  return { session, user };
}

/**
 * Replace the current session with a new one.
 *
 * `defineSessionStore.save()` mints a brand-new signed session id on every call,
 * so login is fixation-safe for free. We call `remove()` first so the superseded
 * Durable Object is actually revoked instead of being orphaned for the full
 * 14-day MAX_SESSION_DURATION. Both calls do `headers.set("Set-Cookie", ...)`,
 * and `set` overwrites, so the response carries only the new cookie.
 */
export async function rotateSession(
  data: SessionInput,
  options?: { maxAge?: number | true },
): Promise<void> {
  const { request, response } = getRequestInfo();

  try {
    await sessions.remove(request, response.headers);
  } catch {
    // No prior session, or an unparseable cookie. Nothing to revoke.
  }

  // rwsdk 1.x: requestInfo.headers is GONE. Session writes go to response.headers.
  await sessions.save(response.headers, data, options);
}

export async function logoutUser(): Promise<{ ok: true; redirectTo: string }> {
  const { request, response } = getRequestInfo();
  await sessions.remove(request, response.headers);
  return { ok: true, redirectTo: "/" };
}

/** The raw session, including a `pendingGroupId` that is not yet authentication. */
export async function loadRawSession(): Promise<Session | null> {
  const { request } = getRequestInfo();
  try {
    return await sessions.load(request);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Guards                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Guards throw `ErrorResponse`, which rwsdk's top-level catch converts into a
 * real HTTP response.
 *
 * THEY MUST BE CALLED AT THE TOP OF EVERY SERVER ACTION. Now that RSC actions
 * run through the middleware pipeline, redirect-style middleware has to skip
 * them (`if (isAction) return;`) — which means the action itself is the
 * enforcement point, not the middleware.
 */

export function getCurrentUser(): AuthUser | null {
  const ctx = getRequestInfo().ctx as AuthContext;
  return ctx?.user ?? null;
}

export function requireUser(): AuthUser {
  const user = getCurrentUser();
  if (!user) {
    throw new ErrorResponse(401, "You need to sign in to do that.");
  }
  return user;
}

export function requireTeacher(): AuthUser {
  const user = requireUser();
  if (!isTeacherRole(user.role)) {
    throw new ErrorResponse(403, "Forbidden");
  }
  return user;
}

export function requireStudent(): AuthUser {
  const user = requireUser();
  if (user.role !== "STUDENT") {
    throw new ErrorResponse(403, "Forbidden");
  }
  return user;
}

/**
 * The guard every teacher-side feature must call before touching a group.
 *
 * Ownership is enforced IN THE QUERY (`ownerId = <current user>`), not by
 * comparing a fetched row afterwards, so there is no path where the row is read
 * first. It throws 404 rather than 403 so a teacher cannot distinguish "someone
 * else's group" from "no such group" and enumerate ids by response code.
 *
 * `executor` exists so a caller that is INSIDE a transaction can run the guard
 * on that transaction. It is not a preference: the ambient `db` is a pool of
 * `max: 1`, so asking it for a connection while the caller's transaction holds
 * the only one deadlocks the request. It also means the guard sees rows the
 * transaction has written but not yet committed. The default keeps every
 * existing call site working unchanged.
 */
export async function assertTeacherOwnsGroup(
  groupId: string,
  executor: Kysely<AppDatabase> | Transaction<AppDatabase> = db,
): Promise<AuthUser> {
  const user = requireTeacher();

  let query = executor
    .selectFrom("groups")
    .select("id")
    .where("id", "=", groupId);

  if (user.role !== "ADMIN") {
    query = query.where("ownerId", "=", user.id);
  }

  const group = await query.executeTakeFirst();

  if (!group) {
    throw new ErrorResponse(404, "Not found");
  }

  return user;
}

/** The student-side mirror: a student may only touch groups they are enrolled in. */
export async function assertStudentEnrolled(
  groupId: string,
): Promise<AuthUser> {
  const user = requireStudent();

  const enrollment = await db
    .selectFrom("enrollments")
    .select("id")
    .where("groupId", "=", groupId)
    .where("userId", "=", user.id)
    .executeTakeFirst();

  if (!enrollment) {
    throw new ErrorResponse(404, "Not found");
  }

  return user;
}

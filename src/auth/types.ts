import type { Session } from "@/session/durableObject";
import type { CodeKind, CodeMode, UserRole } from "@/db";

export type { CodeKind, CodeMode, UserRole };

/**
 * The authenticated user as carried on `ctx`. Deliberately a NARROW projection —
 * never put a raw row here, so nothing sensitive is ever one spread away from a
 * client component's props.
 */
export type AuthUser = {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
};

/**
 * `src/worker.tsx` declares `export type AppContext = AuthContext;` and
 * `types/rw.d.ts` augments rwsdk's `DefaultAppContext` from it, which is what
 * makes `ctx` typed everywhere without importing anything.
 */
export type AuthContext = {
  session: Session | null;
  user: AuthUser | null;
};

export function isTeacherRole(role: UserRole): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

export function dashboardPathForRole(role: UserRole): string {
  return isTeacherRole(role) ? "/teacher" : "/student";
}

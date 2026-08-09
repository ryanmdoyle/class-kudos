import "server-only";

import { getRequestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { newId, nowIso } from "@/lib/sqlite";

/**
 * Failed-login throttling.
 *
 * A per-student class code is 6 characters over a 30-symbol alphabet (~729M
 * combinations). That is comfortably beyond classroom guessing but trivial for
 * a script, and the student login endpoint is unauthenticated by definition —
 * so it needs a brake.
 *
 * THE CRITICAL CONSTRAINT: a school NATs an entire class behind a single public
 * IP. Thirty students logging in during the first minute of a lesson all share
 * one key. So:
 *
 *   - only FAILURES are counted; a successful login costs nothing;
 *   - the student budget is set well above what a room full of children
 *     mistyping a printed code will ever produce, while still cutting brute
 *     force from millions of attempts to a few hundred per hour.
 *
 * Getting this wrong in the other direction is worse than having no limit at
 * all: locking a teacher out of their own classroom mid-lesson is a louder
 * failure than a theoretical attack.
 *
 * This is app-level defence only. A Cloudflare Rate Limiting rule on the login
 * path is a good second layer — it sheds load before a request ever reaches the
 * worker — but that is dashboard configuration and cannot be committed here.
 * See SUPABASE_SETUP.md for where it belongs.
 */

export type RateLimitScope = "student-code" | "teacher-password";

type Budget = { max: number; windowMs: number };

const BUDGETS: Record<RateLimitScope, Budget> = {
  // Generous: a whole class fumbling printed codes stays well under this, and a
  // script is still held to ~720 guesses/hour against a 729M-wide space.
  "student-code": { max: 60, windowMs: 5 * 60_000 },
  // Tight: teachers are few and type a password they know. Keyed per IP+email.
  "teacher-password": { max: 10, windowMs: 5 * 60_000 },
};

/**
 * The throttling key for this request.
 *
 * `CF-Connecting-IP` is set by Cloudflare's edge and cannot be spoofed by the
 * client in production. It is absent in local dev, where everything collapses
 * to a single "local" bucket — which is fine, and makes the limiter easy to
 * exercise by hand.
 */
function clientKey(suffix?: string): string {
  const { request } = getRequestInfo();
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  return suffix ? `${ip}|${suffix.trim().toLowerCase()}` : ip;
}

/**
 * Has this client burned through its failure budget?
 *
 * Call BEFORE verifying a credential. Prunes expired rows as it goes, so the
 * table self-maintains without a scheduled job.
 */
export async function isRateLimited(
  scope: RateLimitScope,
  suffix?: string,
): Promise<boolean> {
  const { max, windowMs } = BUDGETS[scope];
  const key = clientKey(suffix);
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  // Prune globally, not just for this key: any read is a fine moment to drop
  // everyone's expired rows, and it keeps the table bounded.
  await db.deleteFrom("loginAttempts").where("createdAt", "<", cutoff).execute();

  const rows = await db
    .selectFrom("loginAttempts")
    .select("id")
    .where("scope", "=", scope)
    .where("key", "=", key)
    .where("createdAt", ">=", cutoff)
    .limit(max)
    .execute();

  return rows.length >= max;
}

/**
 * Record one failed attempt. Never call this on success — see the NAT note above.
 */
export async function recordFailedAttempt(
  scope: RateLimitScope,
  suffix?: string,
): Promise<void> {
  await db
    .insertInto("loginAttempts")
    .values({
      id: newId(),
      scope,
      key: clientKey(suffix),
      createdAt: nowIso(),
    })
    .execute();
}

/** Shown when a budget is exhausted. Deliberately vague about why. */
export const RATE_LIMITED_MESSAGE =
  "Too many tries. Wait a few minutes and try again.";

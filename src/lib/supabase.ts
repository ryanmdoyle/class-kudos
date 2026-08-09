import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv, requireSecret } from "@/lib/env";

/**
 * SUPABASE IS A CREDENTIAL-VERIFICATION AND RESET-EMAIL SERVICE. NOTHING ELSE.
 *
 * It is not our identity system, not our session system, and not our database.
 * All app data lives in `rwsdk/db`. If you are about to write `supabase.from(...)`
 * anywhere in this codebase, stop — you are out of scope.
 *
 * The only permitted calls on the anon client are:
 *   - auth.signInWithPassword
 *   - auth.resetPasswordForEmail
 *   - auth.verifyOtp / auth.setSession / auth.updateUser  (password reset completion)
 *
 * Students NEVER touch Supabase; they authenticate with a class code against
 * our own database.
 */

/**
 * Shared client options.
 *
 * persistSession:false     - there is no localStorage in a Worker, and we do not
 *                            want supabase-js owning session state. We mint our
 *                            own rwsdk durable session and discard the JWT.
 * autoRefreshToken:false   - stops a background refresh timer being attached to
 *                            a client we are about to throw away.
 * detectSessionInUrl:false - browser-only behaviour; meaningless here.
 */
export const SUPABASE_CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

function requireSupabaseUrl(): string {
  const url = requireSecret("SUPABASE_URL");

  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `SUPABASE_URL must be a full URL such as https://<project-ref>.supabase.co (got "${url}").`,
    );
  }

  return url;
}

/**
 * Build a fresh anon-key client.
 *
 * DO NOT CACHE THIS AT MODULE SCOPE. Even with persistSession:false,
 * GoTrueClient holds the signed-in session IN MEMORY on the client instance. A
 * module-scope client is shared by every concurrent request in the isolate, so
 * teacher A's in-memory session would still be attached when teacher B's request
 * calls updateUser() — a real account-takeover vector. Construction is pure
 * object allocation (no network), so per-call is cheap.
 */
export function createAnonSupabaseClient(): SupabaseClient {
  return createClient(
    requireSupabaseUrl(),
    requireSecret("SUPABASE_ANON_KEY"),
    SUPABASE_CLIENT_OPTIONS,
  );
}

/** Internal: the admin factory needs the same validated URL. */
export function supabaseUrlForAdmin(): string {
  return requireSupabaseUrl();
}

/** Absolute base URL for links we hand to Supabase (password-reset redirect). */
export function getAppOrigin(request: Request): string {
  return appEnv.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

/** True when a Supabase project is configured at all. Used by the seed script. */
export function isSupabaseConfigured(): boolean {
  return Boolean(appEnv.SUPABASE_URL && appEnv.SUPABASE_ANON_KEY);
}

/** True when the service-role key is present. Used by the seed script. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(appEnv.SUPABASE_URL && appEnv.SUPABASE_SERVICE_ROLE_KEY);
}

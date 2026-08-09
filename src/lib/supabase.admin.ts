import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSecret } from "@/lib/env";
import { SUPABASE_CLIENT_OPTIONS, supabaseUrlForAdmin } from "@/lib/supabase";

/**
 * !! SERVICE ROLE KEY !!
 *
 * This key bypasses every authorization rule in the Supabase project. It must
 * never reach the browser. Five independent things keep it out:
 *
 *  1. `import "server-only"` above. The `server-only` package resolves to an
 *     empty module under the `react-server` condition and to a module whose body
 *     is `throw new Error(...)` everywhere else — so importing this file from a
 *     "use client" module fails the client and SSR builds outright.
 *  2. `requireSecret` reads `env` from "cloudflare:workers", an unresolvable
 *     specifier in the browser bundle. A second, independent hard failure.
 *  3. Module separation. This file is not `src/lib/supabase.ts`; the anon module
 *     never references SUPABASE_SERVICE_ROLE_KEY, and nothing under `src/app/`
 *     imports this path. `src/auth/index.ts` deliberately does NOT re-export
 *     `provisionTeacher`, so no barrel import can drag this in.
 *  4. The env var has no `VITE_` prefix, so Vite cannot statically inline it
 *     into a client chunk.
 *  5. Auditable in one command:
 *        grep -rE "^\\s*import .*(supabase\\.admin|auth/provision)" src/app   # must be empty
 *
 * The ONLY permitted call on this client is `auth.admin.createUser`. Never
 * `supabase.from(...)` — this app has no Postgres data.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(
    supabaseUrlForAdmin(),
    requireSecret("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_CLIENT_OPTIONS,
  );
}

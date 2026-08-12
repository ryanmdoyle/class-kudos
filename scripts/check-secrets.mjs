#!/usr/bin/env node
/**
 * Pre-flight: are all the production secrets the Worker needs actually set?
 *
 *   npm run check:secrets
 *
 * ============================================================================
 * WHY THIS IS A SCRIPT AND NOT A wrangler.jsonc FIELD.
 *
 * wrangler 4 has a `secrets: { required: [...] }` config field that makes
 * `wrangler deploy` refuse when a listed secret is unset, and this repo used it
 * briefly. It had a side effect that is not documented and only shows up when you
 * probe for it: declaring it turns `.dev.vars` into an ALLOW-LIST. Any key not on
 * the required list stops becoming a Worker binding in development — so
 * `SENTRY_DSN` and `ALLOW_REMOTE_DB` silently could not be set locally at all.
 *
 * There is no `optional` counterpart to pair with it, so the choice was binary:
 * deploy-time fail-fast, or a usable `.dev.vars`. This script gets the first
 * without giving up the second.
 *
 * It is also a better check than the config field was: it works the same whether
 * the Worker already exists or not, and it tells you the whole list of what is
 * missing in one go rather than failing on the first.
 * ============================================================================
 *
 * Why it matters at all: `requireSecret` throws at FIRST USE, not at startup. A
 * missing secret therefore produces a deploy that goes completely green followed by
 * a site where every login 500s. This turns that into a pre-flight error.
 */
import { execFileSync } from "node:child_process";

/**
 * Secrets the Worker cannot run without.
 *
 * SENTRY_DSN is deliberately absent — it is optional by design: unset means the
 * Worker disables the SDK, the document injects no DSN, and the CSP does not widen.
 */
const REQUIRED = [
  "AUTH_SECRET_KEY",
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
];

let raw;
try {
  raw = execFileSync("npx", ["wrangler", "secret", "list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  console.error("Could not list Worker secrets.\n");
  console.error(String(error.stderr || error.message).trim());
  console.error(
    "\nIf this is an auth problem, `npx wrangler whoami` will say so. If it " +
      "complains about a redirected config path, run `npm run build` first — " +
      ".wrangler/deploy/config.json points into dist/.",
  );
  process.exit(1);
}

/* wrangler prints a banner before the JSON, so start at the array. */
const start = raw.indexOf("[");
let present;
try {
  present = new Set(JSON.parse(raw.slice(start)).map((s) => s.name));
} catch {
  console.error("Could not parse `wrangler secret list` output:\n");
  console.error(raw.trim());
  process.exit(1);
}

const missing = REQUIRED.filter((name) => !present.has(name));

if (missing.length > 0) {
  console.error("Missing required Worker secrets:\n");
  for (const name of missing) console.error(`  ${name}`);
  console.error("\nSet each one with:\n");
  for (const name of missing) console.error(`  npx wrangler secret put ${name}`);
  console.error(
    "\nSUPABASE_SETUP.md §6 is the canonical list, including which value each " +
      "takes.\nNote DATABASE_URL must be the Supavisor pooler on port 6543 " +
      "(STACK.md trap 4).",
  );
  process.exit(1);
}

console.log(`All ${REQUIRED.length} required secrets are set.`);

const optional = ["SENTRY_DSN"].filter((name) => !present.has(name));
if (optional.length > 0) {
  console.log(`Optional and unset: ${optional.join(", ")} (deliberately fine)`);
}

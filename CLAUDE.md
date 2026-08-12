# Working in this repo

Instructions for Claude Code (and useful to a human picking this up cold).

**Read [STACK.md](./STACK.md) before changing anything.** It is not a tour — it is
the set of things that are true about the design, why each piece is the piece it is,
and eight traps that are invisible until they bite. Most mistakes in this codebase
are one of those eight. [README.md](./README.md) covers running it;
[SUPABASE_SETUP.md](./SUPABASE_SETUP.md) covers every dashboard setting.

---

## Always update the docs in the same change

Documentation here is load-bearing, not decoration: the traps in STACK.md are the
only warning a future reader gets, and several of them describe failures that are
silent at runtime. A change that leaves them stale is not finished.

Before calling any task done, check each of these and update what the change
touched:

| If you changed | Update |
| --- | --- |
| an architectural choice, or anything in the traps | `STACK.md` — and if a §-numbered section moves, fix the cross-references |
| how to run, test or seed | `README.md`, including the scripts table |
| the deploy process, or anything `npm run release` does | `DEPLOY.md` — and README's Deploying section if the summary there stops being true |
| how a version number is chosen, or how a release is cut | `DEPLOY.md` §"Releases and versioning" — the bump table is the rule, so a release that contradicts it changes the table or is renumbered |
| an env var, secret, or its shape | `.env.example`, the template you copy to `.dev.vars` (the one local env file, gitignored) — and `REQUIRED` in `scripts/check-secrets.mjs` if the Worker cannot run without it |
| the `"use server"` surface | the golden list in `tests/unit/actionIds.test.ts` AND a row in `tests/integration/authz.test.ts` — every export is a public endpoint |
| a race, a guard, or a transaction | a row in `scripts/mutate.sh`, then run it |
| behaviour a comment describes | that comment, in the same commit |

**STACK.md's own rule, which applies to you:** *"If something here disagrees with a
comment in the code, the code wins. Fix this file."*

Two failure modes worth naming, because both have happened here:

- **A comment that overstates a guarantee is worse than no comment.** The
  `assertRealOverlap` helper was documented as proving requests overlapped when it
  could not fail; the docs were corrected in `parallel.ts` and `STACK.md` but not in
  the test file that consumed it, so the repo contradicted itself for a while.
- **Fixing a bug means updating the test that pinned it.** Tests written to document
  a known defect are deliberately phrased to fail once it is fixed. Flip them, do
  not delete them.

---

## Comment style

Match what is there. Comments in this repo explain **why**, name what was rejected
and why, and state consequences in concrete terms ("a database that has done one
without the other has either stolen a child's points or minted them for free").
They do not narrate mechanics the code already shows.

Where something is deliberately not covered, say so plainly rather than implying it
is. Honest gaps are more useful than implied guarantees.

---

## Testing

```sh
npm run test:db            # supabase start && db reset && seed   (once)
npm test                   # unit — no database, no Docker, no network
npm run test:integration   # drives real RSC actions over HTTP
npm run test:mutate        # break the app on purpose; the suite must notice
npm run check              # generate + tsc + tsc -p tsconfig.test.json
npm run check:secrets      # are the Worker's required secrets set?  (before a deploy)
```

Rules that are not obvious:

- **`npm test` must stay dependency-free.** If a test in `tests/unit/` needs a
  database URL or a server, it is not a unit test.
- **Real concurrency means N independent HTTP requests.** `db` is a per-request pool
  with `max: 1`, so N promises inside one request queue on one connection and no
  race happens.
- **A race test must be mutation-tested, not merely green.** `assertRealOverlap`
  proves less than its name suggests — read its header. `scripts/mutate.sh` is what
  actually establishes that a test defends what it claims.
- **Run `npm run test:mutate` on a committed tree.** It edits source files. It
  refuses to run on a dirty tree for good reason.
- **Never point the tests at the online Supabase project.** The harness refuses a
  non-local database (`tests/helpers/env.ts`), and that guard is not decoration: the
  fixtures create and DESTROY groups, students and balances, which is fine against a
  stack `supabase db reset` rebuilds in seconds and is irreversible data loss
  anywhere else. The fix is to put a local `DATABASE_URL` back in `.dev.vars`;
  `ALLOW_REMOTE_TEST_DB=1` exists only for the Supavisor pooler fidelity check.
- **The app refuses a non-local `DATABASE_URL` in dev too.**
  `assertLocalDatabaseUrl` (`src/db/localGuard.ts`) is called from `createHandle()`,
  so one check covers `npm run dev`, `npm run seed`, `npm run provision-teacher` and
  anything else that resolves the `db` proxy. The override is `ALLOW_REMOTE_DB=1`
  **in `.dev.vars`**, not in the shell: Worker bindings come from that file and the
  vite plugin does not forward `process.env`. The two guards' overrides differ for
  that reason — the harness runs in Node and reads `process.env`.

---

## Things not to do

- **Do not add RLS or `supabase.from(...)`.** See STACK.md §2. Half the userbase
  (students) has no `auth.uid()`, so RLS cannot express student authorization even
  in principle.
- **Do not create a module-scope database pool or Supabase client.** Two different
  reasons, traps 1 and 7; optimising one does not justify the other.
- **Do not return a refusal from inside a transaction callback after a write.**
  Kysely rolls back only on a THROWN error (trap 2). The wrong version looks more
  careful than the right one.
- **Do not assume middleware protects an RSC action.** It does not (trap 3). Every
  action calls its own guard, and an action POSTed to an unrouted path still runs.
- **Do not rewrite an *applied* tag in the `migrations` array of `wrangler.jsonc`.**
  Cloudflare migration tags are append-only history. But history means what the
  account actually ran, not what this repo once wrote down: a tag naming a class
  that was never deployed makes `wrangler deploy` fail outright. DEPLOY.md's
  Gotchas has the error and the two commands that tell you what is really applied.
- **Do not add `secrets: { required: [...] }` to `wrangler.jsonc`.** It looks like a
  free safety win — `wrangler deploy` refuses when a listed secret is unset — and it
  silently turns `.dev.vars` into an allow-list: any key not listed (`SENTRY_DSN`,
  `ALLOW_REMOTE_DB`) stops reaching the Worker in development. There is no `optional`
  counterpart, so the choice is binary. `npm run check:secrets` does the same job
  without the side effect. This was tried and reverted.
- **Do not commit secrets.** `.dev.vars` is gitignored and is the only local env
  file. The Supabase keys that DO appear in `.env.example` and CI are the CLI's fixed
  local demo values, which are public by design.

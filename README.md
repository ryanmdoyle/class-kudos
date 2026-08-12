# Class Kudos

A classroom points-and-rewards app. Teachers award kudos, students spend them on
rewards, and everyone can see where the class is. Built on
[RedwoodSDK](https://docs.rwsdk.com/) and deployed to Cloudflare Workers.

Before changing anything non-trivial, read **[STACK.md](./STACK.md)** — why each
architectural choice was made, what was rejected, and the traps that are
invisible until they bite.

## Stack

- **RedwoodSDK 1.7** — RSC, server actions, server-driven routing
- **Supabase Postgres** — the application database, reached with Kysely over the
  Supavisor transaction pooler. The schema lives in `supabase/migrations/*.sql`
  and the row types in `src/db/types.ts` are hand-written to match it; there is
  no codegen step
- **Sessions** — `rwsdk/auth`'s `defineDurableSession`, backed by a Durable Object
- **Supabase Auth** — verifies teacher passwords and sends teacher emails
  (signup confirmation, password reset). It is not the session layer (see below)
- **React 19.2**, Tailwind v4, Radix primitives styled after
  [neobrutalism.dev](https://www.neobrutalism.dev/)
- **TypeScript 7**, Vite 8, Wrangler 4

## How authentication works

Two completely separate paths, because the two kinds of user are nothing alike.

**Students sign in with a class code — nothing else.** They have no email
address, no password, and no device they can register. Each group is in one of
two modes, chosen by the teacher:

- **shared** — one code for the whole class. A student enters it, then picks
  their name from the group roster.
- **individual** — every student gets their own code, which signs them straight
  in. Teachers can bulk-generate, print, and reset codes individually.

Codes use a 30-symbol alphabet that drops `0 O 1 I L` (misread off a printed
sheet) and `U` (Crockford's convention, to avoid generating accidental words —
which matters when the audience is nine-year-olds). They are compared in constant
time.

**Teachers sign in with email and password, verified by Supabase.** Supabase Auth
checks the password and sends the emails; it is not the session layer. Once it
confirms the password, the app mints its own durable session keyed to the local
user row and does not contact Supabase again for the life of that session. For a
teacher or admin, `users.id` IS the Supabase `auth.users.id` — the same uuid on
both sides, so there is no link column to keep in step. Students get a plain uuid
and have no Supabase counterpart; they never touch Supabase at all.

The app database is Supabase Postgres, but it is reached with Kysely over the
pooler, never through the Supabase client: there is no `supabase.from(...)`
anywhere in this codebase.

Teachers sign themselves up from the Teacher tab on the login page. Signup asks only for a
name and email — **never a password**. Supabase emails a confirmation link, and the password
is chosen from that link by whoever controls the mailbox. Nothing is written to the local
database until that token is verified.

That is not fussiness: Supabase re-sends confirmation for an existing-but-unconfirmed
address *without* updating its password, so a password captured at signup could belong to
somebody who pre-registered your address. Deferring it closes that hole, and stops strangers
squatting teacher email addresses behind the `UNIQUE` constraint.

`npm run provision-teacher` remains the operator route — the first account, an ADMIN, or an
account created without waiting on an email.

## Getting started

Everything runs against the local Supabase stack — no cloud project, no keys of
your own, and it is what the test suite uses:

```shell
npm install
docker info > /dev/null       # Docker must be running
cp .env.example .dev.vars     # works as-is; change AUTH_SECRET_KEY
npm run test:db               # supabase start && db reset && seed
npm run dev
```

`.env.example` ships the local stack's real values — the Supabase CLI's fixed demo
keys and the password `postgres`, identical on every machine and none of them
secret — so the copy works unedited apart from `AUTH_SECRET_KEY`. `npm run test:db`
then prints the seeded teacher's credentials (`teacher@classkudos.local` /
`changeme-please-8+`) and the class codes.

A real Supabase project is only needed to deploy; see
[SUPABASE_SETUP.md](./SUPABASE_SETUP.md). Dev never needs one — see
**Environments** below.

Migrations are plain SQL in `supabase/migrations/` and are applied explicitly —
`supabase db reset` locally, `npm run migrate` (`supabase db push --linked`)
against the linked project. Nothing migrates itself at startup or on first
request.

Seeding creates one teacher, one group, five students, and class codes for both
login modes. The seeded teacher IS a Supabase auth user, so without the keys the
script stops before writing anything.

## Environments

There is nothing to choose. `.dev.vars`, copied from `.env.example`, is the one local
file — the Worker and the test harness both read it, so they cannot disagree about a
value. Production has no file at all: its values are wrangler secrets, and nothing on
your machine reaches it.

There is no "remote dev" mode either. `npm run migrate` uses the `supabase link` and
the Keychain, `npm run release` wrangler secrets, the nightly backup the
`SUPABASE_DB_URL` *GitHub* secret, and the local stack catches confirmation and reset
email at `http://127.0.0.1:54324` — nothing was left for a mode to do. A genuine
one-off is two edited lines in `.dev.vars` (`DATABASE_URL` plus `ALLOW_REMOTE_DB=1`),
deleted again afterwards. Not a shell prefix: `DATABASE_URL=… npm run dev` looks like
it should work and silently does nothing, because the vite plugin builds bindings from
`.dev.vars` and does not forward `process.env`. That asymmetry is the reason the two
guards below take their overrides from different places.

Dev and the tests share **one** local database, so `npm run test:db` re-seeds the
database you are developing against. Separating them would need per-command config,
which is exactly what was removed.

Two guards keep a development machine off a real database, and their overrides sit in
different places because they run in different places:

- **The app refuses a non-local `DATABASE_URL` under `IS_DEV`** — one check in
  `createHandle()`, covering `dev`, `seed`, `provision-teacher` and any future script.
  Override with `ALLOW_REMOTE_DB=1` **in `.dev.vars`**, not your shell: Worker bindings
  come from that file. It never fires in production.
- **The test suite refuses one too** — its fixtures destroy groups, students and
  balances: free against a stack `supabase db reset` rebuilds in seconds, data loss
  anywhere else. Override with `ALLOW_REMOTE_TEST_DB=1` as a **shell** variable, since
  the harness runs in Node; it is for the Supavisor pooler fidelity check alone.

## Tests

```shell
npm test                  # unit — pure functions, no database, no Docker
npm run test:integration  # the real suite: spawns a dev server, needs test:db first
npm run test:all
npm run test:mutate       # break the app on purpose; the suite must notice
```

`npm test` is the one that runs anywhere. The integration suite drives real RSC
actions over HTTP and asserts against the database, because the guarantees it
protects — a `points >= cost` compare-and-swap, a rollback that only happens on a
thrown error — live in Postgres and nowhere else.

It reuses a dev server if one is already running and otherwise starts its own. To
watch the server's own logs (where worker-side stack traces actually appear), run
it yourself and set `TEST_SERVER=external`.

`npm run test:mutate` is the one that checks the tests themselves. It removes a
guarantee — a compare-and-swap, a rollback, an ownership check — and confirms a
specific test goes red, because a green suite only proves the tests ran. Currently
23 mutations: 22 killed, 1 rejected by TypeScript before it can even run. Run it on
a committed tree; it edits source files and refuses to start on a dirty one.

**If you add a race, a guard or a transaction, add a row to `scripts/mutate.sh`.** A
test with no row there has never been shown to fail.

**See [STACK.md §4](./STACK.md) for how the harness works** — the action recipe,
the five ways an action can refuse, and why a race test that cannot race is worse
than no test at all.

## Supabase

Teacher signup, login, and password reset need a Supabase project, **with custom SMTP** —
Supabase's built-in mailer refuses to deliver to anyone outside your project team, so
without it no teacher will ever receive an email. **See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** — in particular the two email
templates, **both** of which must be changed from Supabase's defaults. The defaults produce
links this architecture cannot complete server-side, and signup confirmation and password
reset will both fail until you change them.

## Creating a real teacher account

`npm run seed` also creates demo data, so do not run it against production. To
create just an account:

```shell
# add to .dev.vars, then remove them afterwards
TEACHER_EMAIL=you@school.org
TEACHER_PASSWORD=a-real-password

npm run provision-teacher
```

Credentials come from `.dev.vars` rather than the command line so they stay out
of your shell history. The script is idempotent.

Aimed at production it hits the dev guard, so a non-local `DATABASE_URL` needs
`ALLOW_REMOTE_DB=1` in `.dev.vars` as well. That friction is the point: `npm run seed`
travels the same path and would write demo students into a real roster.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run types` | `tsc --noEmit` on the app |
| `npm run types:test` | Typecheck `tests/` against Node's lib, not workerd's |
| `npm run check` | Regenerate Cloudflare types, then both typechecks |
| `npm test` | Unit tests. No database, no server, no Docker |
| `npm run test:watch` | Unit tests, re-running on change |
| `npm run test:integration` | Integration suite (needs `npm run test:db` first) |
| `npm run test:all` | Both projects |
| `npm run test:db` | Start local Supabase, reset the schema, seed |
| `npm run test:mutate` | Break the app on purpose and check the suite notices |
| `npm run check:secrets` | Check every required production secret is set |
| `npm run seed` | Seed a full demo database |
| `npm run provision-teacher` | Create one teacher, no demo data |
| `npm run build` | Production build |
| `npm run migrate` | Apply `supabase/migrations/*.sql` to the linked project |
| `npm run release` | Build, migrate, then deploy to Cloudflare |

## Backups

Supabase does **not** back up free-tier projects — daily backups begin at Pro. Until
then `.github/workflows/backup.yml` is the only copy of the data outside the live
database. It dumps schema and data nightly and uploads them as a workflow
artifact.

Two things about it are easy to get wrong:

- It needs a repository secret **`SUPABASE_DB_URL`**, and it is NOT the same
  string as the runtime `DATABASE_URL`. `pg_dump` needs session-level features
  the transaction pooler (port 6543) does not provide, so use the **session
  pooler on port 5432** — same host, different port.
- GitHub only runs scheduled workflows from the **default branch**. On a feature
  branch it will never fire; run it once by hand from the Actions tab after
  merging, rather than assuming it works.

Artifacts are deleted after 90 days, so this is recent-recovery, not an archive.
It has one happy side effect: a free project pauses after ~7 days idle, and the
nightly connection counts as activity — which is what stops a half-term holiday
putting the site to sleep.

## Things worth knowing before you change something

- **Transactions work.** Multi-write flows wrap in
  `db.transaction().execute(async (trx) => …)` and pass `trx` all the way down.
  Points are still adjusted with atomic expression updates
  (`set((eb) => ({ points: eb('points', '-', n) }))`) rather than
  read-modify-write, because that is correct under concurrency regardless of the
  transaction.
- **The connection is request-scoped.** The Workers runtime binds a socket to the
  request that opened it, so `db` is a per-request proxy and there is no
  module-scope pool. Scripts have no request: wrap them in `withDb()`.
- **Server actions run through global middleware.** Redirect-style middleware
  must not 302 an action — the login action fires from `/`, and a redirect would
  swallow it. Guards reject unauthenticated actions with a 401 instead. Letting
  one fall through to a page render makes the page throw *inside* the RSC stream,
  which never terminates and hangs the worker.
- **`src/auth/provision.ts` carries the service-role key.** It must never be
  imported from anything under `src/app/`, and must never become an action.
- Migrations are append-only SQL files in `supabase/migrations/`, and nothing
  infers types from them. Every schema change needs a matching edit to
  `src/db/types.ts`, or Kysely will happily typecheck a query the database
  rejects.

## Deploying

**See [DEPLOY.md](./DEPLOY.md)** — the pre-flight checks, what to watch, the smoke
tests, rollback, and how a release is versioned and cut afterwards.

```shell
npm run release
```

Two things worth knowing before you read further, because this section used to get
both wrong:

- It is **not** just `build → migrate → deploy`. It starts with
  `rw-scripts ensure-deploy-env`, which **prompts `y/N`**, leaves a junk
  `TMP_WORKER_CREATED` secret, and would silently generate an `AUTH_SECRET_KEY` if
  one were missing. `npm run migrate` then prompts for the database password. Two
  interactive stops, so a release cannot run unattended — which is also why no CI
  job deploys.
- **Nothing deploys automatically.** Merging to `main` runs CI and changes nothing
  users can see.

Migrate runs **between** build and deploy, deliberately: a compile error costs
nothing before any schema has changed, and the new code never starts against an old
schema. The consequence is a brief window where the schema is ahead of the running
code, so **keep migrations additive** — add columns and tables, never rename or drop
them in the same release as the code that stops using them. Split destructive changes
across two deploys.

Migrating needs the Supabase CLI linked (`supabase link --project-ref <ref>`); the ref
and token are machine-local, so on another machine set `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD`.

`npm run check:secrets` lists the Worker's secrets and fails naming any of the six it
cannot run without. Run it before the first release: `requireSecret` throws at first
use rather than at startup, so a missing one deploys completely green and then 500s
every login. It is a script rather than wrangler's `secrets.required` field because
declaring that field turns `.dev.vars` into an allow-list, which silently made
`SENTRY_DSN` and `ALLOW_REMOTE_DB` unsettable locally. See
[SUPABASE_SETUP.md](./SUPABASE_SETUP.md) §6 for the canonical list. `APP_URL` is
production-only; leave it unset locally so emailed links point at your dev server.

A Cloudflare Rate Limiting rule on the login path is recommended as a second layer in
front of the app-level throttling in `src/auth/rateLimit.ts`.

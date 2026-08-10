# Class Kudos

A classroom points-and-rewards app. Teachers award kudos, students spend them on
rewards, and everyone can see where the class is. Built on
[RedwoodSDK](https://docs.rwsdk.com/) and deployed to Cloudflare Workers.

## Stack

- **RedwoodSDK 1.7** — RSC, server actions, server-driven routing
- **`rwsdk/db`** — Kysely over a SQLite Durable Object. Schema types are inferred
  from the migrations themselves; there is no schema file and no codegen step
- **Sessions** — `rwsdk/auth`'s `defineDurableSession`, backed by a Durable Object
- **Supabase Auth** — verifies teacher passwords and sends teacher emails
  (signup confirmation, password reset), and nothing else (see below)
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

Codes avoid the characters `0 O 1 I l`, since children copy them off a printed
sheet, and are compared in constant time.

**Teachers sign in with email and password, verified by Supabase.** Supabase is
used *only* to check the password and to send reset emails — it is not the
identity store, not the session layer, and never a data source. Once it confirms
the password, the app mints its own durable session keyed to the local user row
and does not contact Supabase again for the life of that session. There is no
`supabase.from(...)` anywhere in this codebase, and students never touch Supabase
at all.

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

```shell
npm install
cp .env.example .dev.vars   # then fill it in
npm run dev
```

Migrations run automatically on dev-server startup, and on the first request in
production. There is no separate migrate command.

Seed a working local database — one teacher, one group, five students, and class
codes for both modes:

```shell
npm run seed
```

The seeded teacher cannot log in until Supabase is configured; the script says so
loudly. Everything on the student side works immediately.

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

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run types` | `tsc --noEmit` |
| `npm run check` | Regenerate Cloudflare types, then typecheck |
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

- **`rwsdk/db` has no transactions.** `db.transaction().execute()` typechecks but
  throws at runtime. Multi-write flows use atomic expression updates
  (`set((eb) => ({ points: eb('points', '-', n) }))`) and guard clauses instead of
  read-modify-write. Do not introduce a read-then-write on points.
- **SQLite has no booleans and no dates.** Booleans are integers, datetimes are
  ISO-8601 text. Convert in one place per table, not at each call site.
- **Server actions run through global middleware.** Redirect-style middleware
  must not 302 an action — the login action fires from `/`, and a redirect would
  swallow it. Guards reject unauthenticated actions with a 401 instead. Letting
  one fall through to a page render makes the page throw *inside* the RSC stream,
  which never terminates and hangs the worker.
- **`src/auth/provision.ts` carries the service-role key.** It must never be
  imported from anything under `src/app/`, and must never become an action.
- Migrations are append-only, and the schema type is derived from what `up()`
  returns. Always `return` the array of awaited `.execute()` results.

## Deploying

```shell
npm run release
```

That is `build → migrate → deploy`, and the order is deliberate:

- **Build first.** A compile error then costs nothing — no schema has changed yet.
- **Migrate before deploy**, so the new code never starts against an old schema.
  `supabase db push` is idempotent, so a release with no new migrations is a
  no-op rather than an error.

The unavoidable consequence is a brief window where the schema is ahead of the
running code. **Keep migrations additive** — add columns and tables, do not
rename or drop them in the same release as the code that stops using them.
Split a destructive change across two deploys.

Migrating requires the Supabase CLI to be linked (`supabase link --project-ref
<ref>`). In CI, set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` instead.

Set the Supabase secrets in the Cloudflare dashboard (or via `wrangler secret
put`) before the first deploy: `AUTH_SECRET_KEY`, `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_URL`
(`https://classkudos.com` — production only; leave it unset locally so emailed
links point at your dev server). A Cloudflare
Rate Limiting rule on the login path is recommended as a second layer in front
of the app-level throttling in `src/auth/rateLimit.ts`.

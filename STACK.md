# STACK.md

Architecture and reasoning for Class Kudos.

[README.md](./README.md) covers what the app is, how to run it, the scripts and
the deploy order. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) covers every dashboard
setting, key and email template. **This document is neither.** It is the set of
things that are true about the *design* — why each piece is the piece it is, what
was rejected, and the traps that are invisible until they bite.

If something here disagrees with a comment in the code, the code wins. Fix this
file.

---

## 1. The shape of the system

```
                     ┌─────────────────────────────────────────────┐
   browser           │  Cloudflare Worker — src/worker.tsx         │
   documents +  ────▶│  defineApp([ setCommonHeaders, attachAuth,  │
   RSC actions       │              render(Document, routes) ])     │
                     └──┬─────────────────┬──────────────────┬─────┘
                        │                 │                  │
         session id     │   app data      │      teacher passwords,
         (signed cookie)│   (Kysely SQL)  │      signup + reset email
                        ▼                 ▼                  ▼
            SessionDurableObject    Supavisor pooler     Supabase Auth
            SQLite, one DO per      :6543 ──▶ Postgres   (GoTrue REST)
            session                 src/db/index.ts      src/lib/supabase.ts
            src/session/
```

The Postgres box and the Supabase Auth box are the *same Supabase project*,
reached two completely different ways: SQL over the pooler for everything the
app owns, and the auth REST API for the three things only Supabase can do
(check a password, send a confirmation, send a reset). There is no
`supabase.from(...)` call anywhere in this repo:

```sh
grep -rn "supabase\.from(" src
# exactly two hits, both in comments forbidding it:
#   src/lib/supabase.ts, src/lib/supabase.admin.ts
```

**Versions that matter:** RedwoodSDK 1.7.0, React 19.2.8, Kysely 0.28.17,
`pg` 8.23 (pure-JS client, sockets via `pg-cloudflare`), `@supabase/supabase-js`
pinned to 2.112.2, TypeScript 7, Wrangler 4, `compatibility_date`
`2025-08-21` with `nodejs_compat`.

**Sizes that matter:** 11 tables, 2 migration files, 1 Durable Object class,
10 flows that open a transaction, and exactly **5 `"use server"` modules in the
whole repo** (`src/app/pages/user/functions.ts`,
`src/app/components/{student,teacher,public}/functions.ts`, and
`src/app/components/teacher/options/functions.ts`). That last number is the
app's entire network-reachable action surface; keep it small on purpose.

### Two authentication paths

They share nothing but the session they mint at the end.

|                | Teacher / admin                                  | Student                                        |
| -------------- | ------------------------------------------------ | ---------------------------------------------- |
| Credential     | email + password, verified by Supabase           | a class code, checked against `classCodes`      |
| Supabase user? | **yes** — and `users.id` **IS** `auth.users.id`  | **no** — plain uuid, never touches Supabase     |
| Self-signup    | yes, with email confirmation (`signupTeacher`)   | no — a teacher creates the roster               |
| Entry point    | `loginTeacher` in `src/auth/index.ts`            | `loginStudentByCode` in `src/auth/index.ts`     |
| Email address  | required, `UNIQUE`, always stored lowercase      | always `null`                                   |

Both end in `rotateSession({ userId })` (`src/auth/context.ts`), which mints a
fresh signed session id — so login is fixation-safe for free — and revokes the
superseded Durable Object rather than orphaning it for the full 14-day
`MAX_SESSION_DURATION`.

After a teacher logs in, **Supabase is never contacted again for the life of
that session.** The JWT is discarded with the client instance. Every subsequent
request is authorized from the durable session plus the local `users` row —
exactly like a student's.

The shared-code student flow has a second step. A valid group code produces a
session holding only `pendingGroupId`, good for 10 minutes
(`PENDING_GROUP_TTL_MS`), which grants nothing but the right to list that one
group's roster and finish logging in as a member of it. `loadAuthContext`
refuses to populate `ctx.user` from it. That is why `Session` has two optional
fields instead of one.

---

## 2. Why each choice was made, and what was rejected

These were trade-offs. Each one bought something and cost something.

### Kysely over the pooler, not `supabase.from(...)`

PostgREST — which is what `supabase.from()` speaks — has **no client-side
transaction**. Its official answer to a multi-statement write is to move the
work into a `plpgsql` function and call it with `rpc()`. That is not less SQL,
it is *more* SQL, in a second language, living in a place TypeScript cannot
typecheck and code review does not naturally reach.

Ten flows in this app depend on a real transaction:

| Flow | File |
| --- | --- |
| `requestReward` | `src/app/components/student/functions.ts` |
| `applyLocationChange` | `src/app/components/public/locationService.ts` |
| `addGroup` | `src/app/components/teacher/functions.ts` |
| `awardKudos` | `src/app/components/teacher/functions.ts` |
| `createNewStudents` | `src/app/components/teacher/functions.ts` |
| `cancelRedeemed` | `src/app/components/teacher/functions.ts` |
| `deleteLocation` | `src/app/components/teacher/functions.ts` |
| `setGroupCodeMode` | `src/auth/classCodes.ts` |
| `rotateGroupCode` | `src/auth/classCodes.ts` |
| `issueStudentCode` | `src/auth/classCodes.ts` |

Read `cancelRedeemed` if you read only one. The delete and the refund are the
two halves of "this reward was never actually taken", and a database that has
done one without the other has either stolen a child's points or minted them
for free.

**What it costs:** `src/db/types.ts` is hand-written and must be kept in step
with `supabase/migrations/*.sql` by hand. Nothing infers one from the other, so
Kysely will happily typecheck a query the database rejects. Eleven tables did
not justify adding a codegen step to the build; if that changes,
`kysely-codegen --print` in CI is the drift check.

**What supabase-js is still for:** `auth.signInWithPassword`, `auth.signUp`,
`auth.resetPasswordForEmail`, `auth.verifyOtp` / `setSession` / `updateUser`,
and — service-role only, from `src/auth/provision.ts` — `auth.admin.createUser`,
`listUsers`, `updateUserById`. That is the whole list.

### Supabase Postgres, not `rwsdk/db`

`rwsdk/db` is a SQLite Durable Object with a schema inferred by walking a
migration builder chain. It was rejected for three reasons, in increasing order
of severity: it is a preview API; it has no backups; and **it has no
transactions** — `db.transaction().execute()` typechecked and threw at runtime.

That third one was not an inconvenience, it shaped the code. Every multi-write
flow had to be a compensating write with an accepted data-loss window. The
`cancelRedeemed` and `applyLocationChange` comments are the archaeology of that
era, and they now argue the opposite case: the compare-and-swaps stay *even
though* transactions exist, because a transaction decides all-or-nothing while
the CAS decides who wins a race under READ COMMITTED. Do not delete them on the
grounds that the transaction covers it.

**What it costs:** latency. The Workers I/O ownership rule (trap 1 below) means
every request pays a fresh Postgres connection and a TLS handshake. A Durable
Object is co-located with the edge; Supabase is a region away. That is the price
of this architecture, it is known and accepted, and Cloudflare Hyperdrive is the
escape hatch if it ever stops being acceptable. See the header of
`src/db/index.ts`.

**What stayed on SQLite:** sessions. They are small, hot, per-user and
disposable — the one thing a Durable Object is unambiguously better at.
`wrangler.jsonc` keeps a `v1` migration tag naming a now-deleted `Database`
class because Cloudflare migration tags are append-only; `v2` records the
removal. Do not tidy that away.

### `users.id` IS `auth.users.id`

Rejected alternative #1: a nullable `supabaseUserId` join column. That is what
this app used to have, and it produced a six-case matrix in
`adoptConfirmedTeacher`. Making the id *be* the link collapsed three of those
cases from "checked" to **unrepresentable** — read the comment above
`adoptConfirmedTeacher` in `src/auth/localUser.ts`; it is the clearest statement
of the model in the codebase.

Rejected alternative #2: a Postgres trigger on `auth.users` mirroring rows into
`public.users`. It couples our schema to Supabase's auth schema, runs outside
application code, and is invisible to anyone reading the app.

Rejected alternative #3: a real foreign key to `auth.users`. It would have to be
nullable to admit students — which reintroduces exactly the nullable
cross-system column this design removes. `supabase/migrations/0001` says so
explicitly and leaves the FK out.

**What it costs, honestly:**

- A local row can never be re-pointed at a different auth user. `id` is the
  primary key *and* the link, so "relinking" would mean rewriting every foreign
  key that references that teacher. `provisionTeacher` detects this and refuses
  with an error telling you to delete one of the two rows.
- There is no database-level guarantee that a `users.id` exists in
  `auth.users`. Nothing enforces it; the invariant is maintained by the fact
  that a teacher row is only ever inserted with an auth id in hand
  (`insertTeacherRow` requires `id`).

### Application-level authorization, not RLS

The app connects as the owning role over the pooler. No JWT ever reaches
Postgres, so `auth.uid()` is null in every session and an RLS policy would have
nothing to match on. Getting identity into the connection would mean either
forwarding a Supabase JWT per request — which contradicts the whole
"discard the JWT, mint our own session" design — or a `set_config` per statement
on a *pooled* connection, which is a footgun.

The deeper reason: **students are not Supabase users at all.** Half the userbase
has no `auth.uid()`. RLS could not express student authorization even in
principle.

What does the work instead:

- `requireUser()` / `requireTeacher()` / `requireStudent()` — `src/auth/context.ts`
- `assertTeacherOwnsGroup(groupId, executor?)` — puts `ownerId = <current user>`
  **in the WHERE clause** rather than comparing a fetched row, and throws **404,
  not 403**, so group ids are not enumerable by response code
- `assertStudentEnrolled(groupId)` — the student mirror
- containment checks inside `applyLocationChange`: the enrollment *and* the
  destination must both belong to the `groupId` passed in
- the `userId`-first-argument invariant in `src/app/pages/student/data.ts`

**What it costs:** one missed guard is a hole, with nothing behind it. That is
why every `routes.ts` carries the reminder, why the `"use server"` surface is
five files, and why `src/app/pages/user/functions.ts` wraps its exports by hand
instead of re-exporting `@/auth`.

### Teacher signup collects no password

Not squeamishness — a concrete attack. GoTrue's `/signup`, when the address
already exists but is *unconfirmed*, re-sends the confirmation email and
deliberately does **not** update the stored password. So if signup took a
password: an attacker pre-registers a teacher's address with password A; the
real teacher later "signs up" with password B, is confirmed, and never notices B
was discarded; the attacker polls until the account confirms and signs in with A
as a TEACHER. Students know their teachers' email addresses.

So signup writes **nothing** locally. The password is chosen at the confirmation
step by whoever demonstrably controls the mailbox — the same standard
`completePasswordReset` already trusts. It also means nobody can squat teacher
addresses behind the `UNIQUE` email constraint. See the block comment above
`signupTeacher` in `src/auth/index.ts`.

---

## 3. The traps

Each of these has already cost someone time.

### 1. `db` is request-scoped, and it has to be

The Workers runtime binds every I/O object to the request that created it. A
socket opened while handling request A throws

```
Cannot perform I/O on behalf of a different request
```

the moment request B touches it. So there is **no module-scope pool**, and there
must never be one. `db` (`src/db/index.ts`) is a `Proxy` that resolves to a pool
created lazily, once, per request, keyed in a `WeakMap` on the `Request` object.
`src/worker.tsx` closes it in a `finally` so Supavisor reclaims the slot instead
of seeing an abrupt disconnect.

Scripts have no request. `rw-scripts worker-run` reaches the worker's fetch but
not rwsdk's routed pipeline, so `getRequestInfo()` throws — wrap script work in
`withDb(async (db) => …)`. It is deliberately not re-entrant.

**The pool is `max: 1`.** Supavisor does the real pooling; a single Worker
request needs one connection. The consequence is severe and non-obvious: a
helper that closes over the ambient `db` while a transaction is open does not
merely run *outside* the transaction — it asks the pool for a second connection
that the open transaction is holding, and **the request hangs** until the
runtime kills it. Wrong results would be the good outcome.

That is why every function in `src/auth/classCodes.ts` takes a trailing executor,
and why `assertTeacherOwnsGroup` takes one too. Inside a transaction callback, pass
`trx` all the way down. Every statement, no exceptions.

Two shapes of that parameter, and the difference is deliberate:

- `executor: Executor = db` — the common case. Joins a caller's transaction when
  given one, otherwise runs standalone.
- `executor?: Executor` with **no default** — used by `setGroupCodeMode`,
  `rotateGroupCode` and `issueStudentCode` specifically so they can *detect* the
  absence of a transaction and open their own. Each is a delete-then-insert whose
  half-completion would leave a class or a student with no working code at all,
  so they must never run unwrapped.

### 2. Kysely rolls back only on a **thrown** error

Returning a value from the transaction callback — including an
innocent-looking `return { ok: false, error: "…" }` — **commits**.

This is the single most dangerous line in the codebase to get wrong, because the
wrong version looks more careful than the right one. Anywhere a transaction
callback needs to refuse *after* it has already written something, it throws a
sentinel and the outer `catch` converts it back into a result:
`InsufficientPointsError` in `requestReward`, `StaleMoveError` in
`applyLocationChange`, a bare `throw new Error(...)` for the unrefundable cancel
in `cancelRedeemed`.

There is exactly one place where a bare `return` inside a transaction is
correct: `addGroup`'s `if (!inserted) return null` after an
`on conflict do nothing`. Nothing was written, so committing an empty
transaction is right. Every other refusal below the first write must throw.

### 3. RSC actions traverse global middleware — so middleware is not an authorization boundary

In rwsdk 1.x an RSC action POSTs to the **current page URL** plus
`?__rsc_action_id=...`, and it runs through both the global middleware chain and
the `prefix()`/`route()` middleware of that page before `handleAction()` is
called. Any `Response` a middleware returns short-circuits the request, and the
browser receives an HTML 302/403 where it expects an RSC payload.

Two consequences, both load-bearing:

- **Every middleware that can return a Response must begin with
  `if (isAction) return;`** — or return a status the client can act on (the
  401/403 branches in `isAuthenticated` and `checkRoleAccess`). The login action
  fires from `/`, so a redirect-style middleware on `/` would 302 its own login.
- **Every server action must call its own guard.** `requireTeacher()`,
  `requireStudent()`, `assertTeacherOwnsGroup(...)` at the top of the function
  body, every time.

And the failure mode if you get it wrong is worse than a 403. Letting an
unauthenticated action fall through to the page re-render makes the page's
`requireTeacher()` throw `ErrorResponse` **inside the RSC stream**, which never
terminates; the runtime detects the hang and 500s after ~30 seconds. That is
reachable in normal use — any open tab whose session expires 500s on the next
button click.

**Read `isAction` from the middleware argument** (or `getRequestInfo()`), never
from the imported `requestInfo` proxy. That proxy is built from a fixed key list
that does not include `isAction`, so it is always `undefined` there and the
guard silently does nothing.

### 4. The pooler is mandatory — the direct host is IPv6-only

`DATABASE_URL` **must** be the Supavisor transaction pooler,
`…pooler.supabase.com:6543`. The direct connection
(`db.<ref>.supabase.co:5432`) resolves to IPv6 only, and Cloudflare Workers
cannot open outbound IPv6 connections. This is a hard requirement, not a
preference. Percent-encode the password.

Related, and easy to get backwards: the nightly backup in
`.github/workflows/backup.yml` needs a *different* string in the
`SUPABASE_DB_URL` repository secret — the **session** pooler on port **5432**,
same host — because `pg_dump` needs session-level features port 6543 does not
provide.

And `SUPABASE_URL` is not a connection string at all; it is the project's API
URL, spoken to over the Auth REST API only. `requireSupabaseUrl()` in
`src/lib/supabase.ts` fails fast with an explanation if you paste a `postgres://`
URI into it, because the Connect dialog leads with one.

### 5. Every identifier is camelCase, and must be quoted in SQL

The schema is camelCase (`classCodes`, `enrollmentId`, `createdAt`). Postgres
folds **unquoted** identifiers to lower case, while Kysely quotes by default —
so `db.selectFrom("classCodes")` emits `"classCodes"` and will not find a table
created as unquoted `classCodes` (stored as `classcodes`).

The failure appears at **runtime**, not build time, and only for the tables you
happen not to exercise in testing. Every identifier in
`supabase/migrations/*.sql` is double-quoted for this reason. If you edit a
migration, or run anything by hand in `psql` or the SQL editor: quote
everything.

### 6. `APP_URL`, the Cloudflare route and Supabase's allow-list must all agree — and a mismatch fails silently

Every confirmation and reset link is built from `APP_URL` (via `getAppOrigin`,
`src/lib/supabase.ts`). Three places must match exactly:

1. the `APP_URL` secret (`npx wrangler secret put APP_URL`)
2. the `routes` host in `wrangler.jsonc` — currently the apex `classkudos.com`;
   `www` is deliberately not routed
3. Supabase's **Site URL** and **Redirect URLs** allow-list

Supabase refuses any `redirectTo` that is not on the allow-list and **silently
substitutes its Site URL**, so the link loses its path and the teacher lands
somewhere that does not answer. No error is raised anywhere. The allow-list needs
all four entries — localhost and production, `/user/reset-password` and
`/user/confirm`.

Leave `APP_URL` unset locally. `getAppOrigin` then falls back to the incoming
request's origin, which is what makes dev links point at `localhost:5173`.
Setting it in `.dev.vars` sends your dev signup links to production.

### 7. Never cache a Supabase client at module scope — a *different* reason from trap 1

Even with `persistSession: false`, `GoTrueClient` holds the signed-in session
**in memory on the instance**. A module-scope client is shared by every
concurrent request in the isolate, so teacher A's in-memory session would still
be attached when teacher B's request calls `updateUser()`. That is an
account-takeover vector, not a tidiness issue. Construction is pure object
allocation with no network, so per-call is cheap.

Trap 1 and trap 7 look like the same rule and are not. Trap 1 is the runtime's
I/O ownership; trap 7 is per-user state. If you ever optimise one, the
justification does not carry over to the other.

### 8. `on conflict` needs an explicit conflict target

A bare `.onConflict((oc) => oc.doNothing())` swallows a conflict on **any**
unique index on the table. In `insertCode` that would silently reinterpret
"this enrollment already has a code" or "this group already has a shared code"
as a code collision, burn all five retry attempts, and report the wrong failure.
Both of those are real bugs that must surface. Same reasoning for
`oc.column("publicId")` in `addGroup`.

Related: the retry loop in `addGroup` **wraps** the transaction rather than
sitting inside it. A failed statement aborts the entire Postgres transaction, so
an in-place retry would die with "current transaction is aborted" and take the
group and its code with it. `on conflict do nothing` does not raise, which is
what makes the retry legal where it stands.

---

## 4. How it is tested

The suite defends the two things from §2 that fail **silently**: the transactional
guarantees, and application-level authorization. Everything else in this app fails
loudly — if `addLocation` breaks you find out by using it. If `cancelRedeemed`
half-commits, a child quietly loses points and nobody ever knows.

```
npm test                 # unit — pure functions. No database, no server, no Docker.
npm run test:integration # drives a real vite dev over HTTP against a real Postgres
npm run test:all         # both
npm run types:test       # typechecks tests/ against Node's lib, not workerd's
npm run test:db          # supabase start && supabase db reset && npm run seed
```

### The database is local, and disposable

`supabase start` gives Postgres on `:54322` and GoTrue on `:54321`, and
`supabase db reset` re-applies `supabase/migrations/*.sql` to a clean database in
seconds. `supabase/config.toml` disables realtime, storage, analytics and edge
functions — this app uses none of them — and enables the local Supavisor pooler on
`:54329`.

A test database has to be one the tests may **destroy**, which rules out the
online project: it is dev today and production the moment `v2-rebuild` merges.
Local also removes a subtler hazard — GoTrue's own rate limit is keyed on the
caller as GoTrue sees it, so it is effectively a global ceiling on teacher logins
per run, and the app deliberately collapses every Supabase error into one string.
Exhaust it against a remote project and your tests fail with "That email and
password didn't match".

**What local does not cover:** production reaches Postgres only through the
Supavisor *transaction* pooler (trap 4), and a direct connection does not exercise
it. To check that, point `DATABASE_URL` at `:54329` — and note it is
`DATABASE_URL`, not `TEST_DATABASE_URL`, because the thing under test is the
**worker's** connection path. Moving only the harness's own connection proves
nothing.

### The harness drives HTTP, not imported functions

`tests/` is a plain-Node program that POSTs RSC actions to a running `vite dev`
and asserts against the database directly with its own Kysely handle.

Two rejected alternatives, for the same underlying reason:

- **`@cloudflare/vitest-pool-workers`.** It bundles test modules with its own
  esbuild and never runs `redwood()`'s RSC transform or directive scan. 52 files
  carry `"use client"` and 14 carry `"use server"`; `SELF.fetch()` against this app
  is not going to work. It also pins a conflicting `wrangler`.
- **Importing the action functions and calling them.** Every one of them reaches
  `getRequestInfo()` for `ctx`, the session, the rate-limit key and `db` itself.
  Faking that means reimplementing rwsdk's request pipeline, and the tests would
  then pass against a pipeline that is not the one production runs.

The consequence is that `db` behaves in tests exactly as it does in production —
one `max: 1` pool per request — which is what makes a race a real race. **N
concurrent promises inside one request are not concurrent**; they queue on one
connection. Real concurrency means N independent HTTP requests, which is what
`tests/helpers/parallel.ts` does.

### The action recipe

```
POST /?__rsc&__rsc_action_id=<urlencoded "/src/…/functions.ts#exportName">
Origin: http://localhost:5173      <- non-GET actions are refused without a match
accept: text/x-component
x-rsc-data-only: true              <- suppresses the page render
cf-connecting-ip: 198.51.100.x     <- per-client rate-limit isolation
body: await encodeReply(args)
```

Four details that are not obvious and each cost time to find:

- **`encodeReply`** from `react-server-dom-webpack/client.edge` runs in plain Node
  and produces exactly what the browser sends — a JSON string for plain arguments,
  a real `FormData` when any argument is one. Hand it to `fetch` and let undici set
  the Content-Type; setting it by hand is the one way to break the nine FormData
  actions.
- **`x-rsc-data-only: true`** makes the page element `null`, so the payload carries
  only the action result and no page renders. This sidesteps the hung-RSC-stream
  failure in trap 3 entirely. It gates on `actionResult !== undefined`, so an
  action returning `undefined` still renders the page.
- **Action ids are derived, never hardcoded** (`tests/helpers/actions.ts` scans
  `src/` for the directive). `tests/unit/actionIds.test.ts` pins the result against
  a golden list of all 35 exports, so a new network endpoint appearing fails a
  test — `src/auth/provision.ts` carries the service-role key and is one stray
  directive away from being one.
- **`node` is never `null`** in a decoded payload, even when the page was
  suppressed. `renderToRscStream` always appends a `<div id="rwsdk-app-end">`
  marker, so a suppressed page is `node[0] === null`.

### Five refusal channels, and why the tests care

Determined by observation against the running app, not from reading rwsdk. Three
of them are HTTP-visible and two are not, and telling them apart is most of what
the authorization tests assert:

| Cause | HTTP | Content-type | Where |
| --- | --- | --- | --- |
| Action **throws** `ErrorResponse` | real 401/403/404 | `text/plain` | guards **outside** `try` — the student module |
| Middleware returns a `Response` | real 401/403 | `text/plain` | `isAuthenticated`, `checkRoleAccess` |
| Action **returns** a value | **200** | `text/x-component` | guards **inside** `try` — the teacher modules |
| Action returns a `Response` | **200** | `text/x-component` | flattened to `{ __rw_action_response: { status } }` |
| POST to an unrouted path | 404 | `text/plain` | the action **still ran**; its result was discarded |

The first two are indistinguishable over HTTP. So every authorization test POSTs
to **`/`**, whose only route middleware returns early for actions — meaning a
refusal there can only have come from the action's own guard. That is what makes
the sweep in `tests/integration/authz.test.ts` evidence of self-guarding rather
than evidence that some middleware happened to catch it.

The last row is a genuine route-middleware bypass: rwsdk's router calls
`handleAction()` **before** returning its 404, so `POST /nope?__rsc_action_id=…`
executes the action with `ctx.user` populated. It is safe only because every action
guards itself — which is exactly the claim trap 3 makes, and now a test.

### A race test that cannot race is worse than no test

"Exactly one winner" passes trivially when the requests serialised: the second
simply arrives after the first has committed. So `inParallel` records
client-observed intervals and `assertRealOverlap` guards against it — but be
precise about how much that proves, because it is less than it looks:

- `maxConcurrent` proves the requests were **in flight from the client** together,
  not that the server interleaved them. On its own it is nearly tautological:
  `inParallel` stamps every start in one synchronous tick, so four deliberately
  sequential 25 ms tasks still report `maxConcurrent = 4`. It is kept because it
  does catch one real regression — a race test rewritten as a sequential
  `for (…) await …` loop drops it to 1.
- `overlapFactor` (summed durations ÷ wall clock) is the serialisation canary, and
  it does discriminate: the same serial measurement gave 2.52 where overlapped work
  gives ≈4. It is only asserted at four or more requests, since serial tends to
  ≈(n+1)/2 and overlapped to ≈n, which do not separate at two. A tighter timing
  assertion was deliberately not added — it would be flaky on a shared runner
  without buying any real confidence.

**What actually proves a race test exercises its compare-and-swap is mutation
testing**, and it is a command rather than a claim:

```sh
npm run test:mutate            # 18 mutations; currently 17 killed, 1 type-rejected
npm run test:mutate -- --list  # the table, with the test each one must turn red
```

`scripts/mutate.sh` removes a guarantee — the `points >= cost` predicate, a
`throw` that becomes a `return`, an `assertTeacherOwnsGroup`, the `trx` threaded into
a helper — and requires a named test to fail. Its header records why each of its
safeguards exists; all three were added after the bug they prevent, and the worst of
them was a harness that silently stopped mutating and therefore reported the tests as
useless. If you change a race, re-run it rather than trusting the overlap helper.

The one skip is informative rather than a gap: `requestReward`'s throw-to-return edit
will not compile, because `points` becomes `number | undefined`. The type system gets
there before the tests do.

The other half of the same discipline: each race test asserts **row counts** and
**which row**, not just return values. An app that returns `ok` once while writing
two `redeemed` rows satisfies "exactly one winner" and has still minted points; one
that refunds the right amount to the wrong child satisfies a balance check on a
single-student fixture. Both are why the fixtures carry a bystander.

---

## 5. What is deliberately not done

- **No RLS, and no `supabase.from(...)`.** See §2. If you are about to write a
  policy, you have left the intended scope.
- **No passkeys, no WebAuthn, anywhere.** They were removed with the pre-1.x
  rewrite. Teachers use email + password; students use a class code. The
  `Session` type's `pendingGroupId` occupies the slot where a WebAuthn
  `challenge` used to live.
- **Students are not Supabase users, and cannot be.** Supabase Auth cannot
  express a class code: `user_metadata` is attached *after* authentication and
  is not a credential, and anonymous users explicitly cannot sign back in as the
  same user once signed out — which is precisely what a class code must do.
- **No email provider of our own.** Confirmation and reset mail is Supabase's.
  Custom SMTP in the Supabase project is **required**, not optional: the
  built-in mailer refuses to deliver outside your project team, so without it no
  teacher ever receives an email — and the app deliberately cannot tell you
  that, because reporting it would leak which addresses have accounts.
- **No codegen for `src/db/types.ts`.** Hand-written on purpose; see §2.
- **No automatic backups.** Supabase does not back up free-tier projects; daily
  backups start at Pro. `.github/workflows/backup.yml` is the only copy of the
  data outside the live database, artifacts expire after 90 days, and GitHub
  only runs scheduled workflows from the **default branch** — so it will never
  fire from a feature branch. Run it once by hand from the Actions tab after
  merging.
- **Nothing keeps the project awake except that backup.** A free project pauses
  after roughly 7 days idle. The nightly dump's connection counts as activity,
  which is what stops a half-term holiday putting the site to sleep. If you
  disable the workflow, you have also removed the keep-alive.
- **`www` is not routed.** Links are always built from `APP_URL` (the apex), so
  `www` never appears in one. If you want it to resolve, add a Cloudflare
  Redirect Rule — cheaper than a second Worker route, and it keeps exactly one
  canonical origin.
- **Nothing migrates itself.** No schema is applied at startup or on first
  request. `npm run migrate` (`supabase db push --linked`) is explicit, and
  `npm run release` runs it *between* build and deploy — which means a brief
  window where the schema is ahead of the running code. Keep migrations
  additive; split destructive changes across two deploys.

---

## 6. Where to look for what

| Path | What lives there |
| --- | --- |
| `src/worker.tsx` | `defineApp`, the middleware chain, the DO export, the Sentry wrapper, the per-request `closeRequestDb`. Read the middleware block comment before touching any middleware. |
| `src/db/index.ts` | The `db` proxy, per-request pool, `withDb()` for scripts, row type aliases. The header explains the request-scoping rule. |
| `src/db/types.ts` | The hand-written Kysely schema. Mirror of `supabase/migrations/*.sql`; change one, change the other. |
| `supabase/migrations/*.sql` | The actual schema. Append-only. `0001` is heavily commented and is the best single explanation of the data model. |
| `src/auth/context.ts` | Session load/rotate/logout, and **every guard**. Not a `"use server"` module. |
| `src/auth/index.ts` | Login (teacher and student), password reset, self-signup + confirmation. Not a `"use server"` module. |
| `src/auth/classCodes.ts` | Teacher-side code issuing, rotation and mode switching. The `executor` parameter convention is documented in its header. |
| `src/auth/localUser.ts` | `users`-row primitives shared by the operator and self-signup paths. **Must never import Supabase.** |
| `src/auth/provision.ts` | **Service-role key.** Operator-only, never an action, never imported from `src/app/**`. |
| `src/auth/rateLimit.ts` | Failure budgets and why they are set where they are (a school NATs a whole class behind one IP). |
| `src/lib/supabase.ts` / `.admin.ts` | The only two places a Supabase client is constructed. Anon vs service-role. |
| `src/lib/env.ts` | The one narrow cast over `Env`, plus `requireSecret` with actionable error messages. |
| `src/session/` | The Durable Object and the lazily-built session store. Still SQLite, deliberately. |
| `src/app/pages/*/routes.ts` | Route wiring only. Each header states what middleware is in front of it and what the actions must therefore do themselves. |
| `src/app/pages/user/functions.ts` | The pre-authentication action boundary. Hand-enumerated on purpose. |
| `src/app/components/*/functions.ts` | The `"use server"` action modules — teacher, student, public board, teacher options. Every export is a public endpoint. |
| `src/app/components/teacher/queries.ts`, `src/app/pages/student/data.ts` | Read-side queries. Neither is `"use server"`; both document the authorization contract with their callers. |
| `src/app/components/public/locationService.ts` | The one implementation of "this student moved", shared by the authenticated and anonymous paths. The best worked example of the transaction + CAS pattern. |
| `src/scripts/` | `seed.ts` and `provisionTeacher.ts`, run via `rw-scripts worker-run`. Both need `withDb()`. |
| `src/db/classCodeSeed.ts` | `insertClassCode` — the ONE place allowed to write `classCodes` without an ownership check, shared by the seed script and the test fixtures. Its header lists the imports it must never gain. |
| `src/lib/pgNativeStub.ts` + `vite.config.mts` | Why the build does not fall over on `pg-native`. |
| `vitest.config.mts` | Two projects: `unit` (no external dependencies, by construction) and `integration`. Replaces `vite.config.mts` for tests, which is why the `@/` and `pg-native` aliases are restated there. |
| `tsconfig.test.json` | Typechecks `tests/` against Node's lib instead of workerd's, so importing `@/db` into a test helper is a compile error. Must restate `exclude`, or it silently checks nothing. |
| `tests/helpers/` | The harness: `rsc.ts` (action client), `fixtures.ts`, `db.ts`, `parallel.ts` (the overlap witness), `flight.ts`, `session.ts`, `actions.ts` (derived action ids). |
| `tests/integration/harness.test.ts` | The harness testing itself. Fails if requests stop genuinely overlapping — otherwise every race test would quietly start passing for the wrong reason. |
| `supabase/config.toml` | The local test stack. Header explains the five deliberate deviations from `supabase init` defaults. |
| `.github/workflows/ci.yml` | Two jobs, no secrets: `check` (typechecks + unit) and `integration` (local Supabase + dev server + full suite). |
| `scripts/mutate.sh` | The mutation battery. One row per guarantee, naming the test that must fail when it is removed. Read its header before adding a row. |
| `CLAUDE.md` | Conventions for anyone (or anything) changing this repo, including which docs must be updated alongside which kind of change. |

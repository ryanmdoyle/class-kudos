# Deploying

How to ship Class Kudos to `classkudos.com`, and what to watch while it happens.

[README.md](./README.md) covers running it locally; [STACK.md](./STACK.md) covers why
it is built this way; [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) covers every Supabase
dashboard setting and is the canonical list of production secrets. **This document is
the deploy itself**, including the parts `npm run release` does that are not obvious.

---

## First, what deploying is *not*

**Nothing deploys automatically.** No workflow runs `wrangler deploy`:

- `.github/workflows/ci.yml` — `pull_request` + `push` to `main`. Typechecks, unit
  tests, then the integration suite against a throwaway Supabase stack. No secrets,
  no deploy step.
- `.github/workflows/backup.yml` — `schedule` + `workflow_dispatch`. Dumps the
  database.

So merging to `main` changes nothing users can see. CI passing means the code is
sound, not that it is live. The two are worth watching at different moments: CI on
the merge, this document when you ship.

**It cannot run unattended.** There are two interactive prompts (below), which is
also why there is no deploy job to add.

---

## Pre-flight

Each of these is read-only. Run them in order; every one has bitten someone.

### 1. The code you think you are shipping

```sh
git switch main && git pull
git log --oneline -1
npm run check          # generate + tsc + tsc -p tsconfig.test.json
npm test               # unit; needs no database
```

The integration suite needs the local stack, so if you want the full set first:
`npm run test:db && npm run test:integration`.

### 2. Production secrets are all present

```sh
npm run check:secrets
```

Lists the Worker's secrets and exits 1 naming any of these six, which it cannot run
without:

```
AUTH_SECRET_KEY  DATABASE_URL  SUPABASE_URL
SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY  APP_URL
```

It matters because `requireSecret` throws at *first use*, not at startup: a missing
secret otherwise gives you a deploy that goes completely green and a site where every
login 500s.

`SENTRY_DSN` is optional — unset means error reporting is off, deliberately and
completely, and the script says so rather than complaining. `TMP_WORKER_CREATED` is
junk that `ensure-deploy-env` leaves behind; ignore it.

**Why a script and not `secrets.required` in `wrangler.jsonc`.** That config field
makes `wrangler deploy` itself refuse, and this repo used it briefly — but declaring
it silently turns `.dev.vars` into an *allow-list*: any key not on the required list
stops becoming a binding in development, so `SENTRY_DSN` and `ALLOW_REMOTE_DB` could
not be set locally at all. There is no `optional` counterpart to pair with it, so the
choice was binary — deploy-time fail-fast, or a usable `.dev.vars`. The script gets
the first without giving up the second, and reports the whole missing list at once.
**The `secrets` block is gone; `wrangler deploy` no longer checks anything.**

**`DATABASE_URL` must be the Supavisor pooler on port 6543** (STACK.md trap 4). The
direct host is IPv6-only and Workers cannot open outbound IPv6.

### 3. Supabase is linked, and you know the migration state

```sh
supabase projects list                 # is xkvmtgpmafwmrajzsyjq linked?
supabase migration list --linked       # which migrations are applied REMOTELY
```

That second command is the only honest way to know. Nothing in the repo records
whether `0001_initial_schema` and `0002_login_attempts` are applied to the online
project — `supabase/.temp/` is gitignored, and the only source of truth is the remote
`supabase_migrations.schema_migrations` ledger.

**This step is machine-bound.** The project ref lives in gitignored
`supabase/.temp/`, and the access token is in the macOS Keychain. On a different
machine you need `supabase link --project-ref xkvmtgpmafwmrajzsyjq` first, and
`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` to avoid the prompts.

### 4. The three things that must agree (STACK.md trap 6)

`APP_URL`, the `routes` host in `wrangler.jsonc`, and Supabase's redirect allow-list.
Every confirmation and reset link is built from `APP_URL` via `getAppOrigin`.

| Must be | Currently |
| --- | --- |
| `APP_URL` secret | `https://classkudos.com` |
| `wrangler.jsonc` `routes` | `classkudos.com`, `custom_domain: true` — apex only, `www` deliberately unrouted |
| Supabase allow-list | all four of `{localhost:5173, classkudos.com} × {/user/reset-password, /user/confirm}` |

**A mismatch fails silently.** Supabase refuses a `redirectTo` that is not on the
allow-list and substitutes its Site URL, which loses the path — so the teacher lands
somewhere that does not answer and no error is raised anywhere. If you set
`APP_URL=https://www.classkudos.com`, links point at an origin the Worker never
answers.

### 5. Dry run — the last safe step

```sh
npx wrangler deploy --dry-run
```

Checks that the config parses and that bindings resolve, then exits without shipping.
Expect `SESSION_DURABLE_OBJECT`, `ASSETS` and `APP_NAME`.

It does **not** contact the API, so it can say nothing at all about secrets — that is
step 2's job, and nothing later in the deploy repeats it.

---

## The deploy

```sh
npm run release
```

Which is:

```
rw-scripts ensure-deploy-env && npm run clean && RWSDK_DEPLOY=1 npm run build && npm run migrate && wrangler deploy
```

Step by step, including the parts README used to omit:

### `rw-scripts ensure-deploy-env`

1. **Prompts `Do you want to proceed with deployment? (y/N)`.** Anything but `y`
   exits 1. ← **first interactive stop**
2. On a machine that has never authenticated, runs a wrangler command purely to
   trigger the login/account picker. ← possible second stop, first time only
3. Runs `wrangler secret put TMP_WORKER_CREATED` to force the Worker to exist. This
   is why that junk secret is there. Harmless; recreated every release.
4. **If `AUTH_SECRET_KEY` is not already set, it generates a random one and sets it
   without showing you.** Yours is set, so this will not fire — but on a fresh Worker
   it means your sessions are signed by a key you never saw, and setting your own
   afterwards is a *rotation* that logs every teacher out. Set secrets before the
   first release, not after.

### `npm run clean`

`rm -rf ./node_modules/.vite` only. It does **not** clear `dist/`.

### `RWSDK_DEPLOY=1 npm run build`

`RWSDK_DEPLOY` is a **dead no-op** in rwsdk 1.7.0 — nothing reads it. The build is
just `vite build`, writing `dist/client/**` and `dist/worker/**`.

`dist/worker/.dev.vars` is written here and looks alarming — it is a copy of your
local `.dev.vars`, including local Supabase values. **`wrangler deploy` ignores it.**
Verified: the uploaded metadata's `vars` is only `{APP_NAME}`, and nothing local is
inlined into `dist/worker/index.js`. It exists for `vite preview` on the built output.
Treat it as a plaintext copy of your secrets on disk, but not as a deploy hazard.

### `npm run migrate`

`supabase db push --linked`, against the online project. **Prompts for the database
password** unless it is cached in the Keychain or `SUPABASE_DB_PASSWORD` is set.
← **second interactive stop**

This runs **between build and deploy**, deliberately: a compile error costs nothing
before any schema has changed, and the new code never starts against an old schema.
The unavoidable consequence is a brief window where the schema is *ahead* of the
running code. **Keep migrations additive** — add columns and tables, never rename or
drop them in the same release as the code that stops using them. Split destructive
changes across two deploys.

### `wrangler deploy`

Uploads the Worker and the assets in `dist/client`. Because
`.wrangler/deploy/config.json` exists, wrangler deploys `dist/worker/wrangler.json`
rather than the root `wrangler.jsonc`.

---

## Watching it

```sh
npx wrangler tail                    # live Worker logs, including exceptions
```

Leave that running in a second terminal while you smoke-test. Otherwise:

- **Cloudflare dashboard** → Workers & Pages → `class-kudos-sdk` → Deployments, and
  Observability (enabled in `wrangler.jsonc`) for request-level detail.
- **GitHub Actions** for CI, which is a separate thing on a separate trigger.
- **Sentry**, once `SENTRY_DSN` is set — server errors go through
  `Sentry.withSentry`, browser errors through `Sentry.init` in `src/client.tsx`.

---

## Smoke checks, in the order things fail

```sh
# 1. It is serving, and the CSP is right. If SENTRY_DSN is set, connect-src must
#    contain your ingest origin — derived from the DSN, so a mismatch means the
#    secret changed shape.
curl -sI https://classkudos.com | grep -i content-security-policy

# 2. Junk is not served. Both should be 404 — see public/.assetsignore, which is
#    honest about the fact that this is the check that actually settles it.
curl -sI https://classkudos.com/.DS_Store | head -1
curl -sI https://classkudos.com/.vite/manifest.json | head -1
```

Then in a browser:

3. **A teacher logs in.** This is the big one: it proves `DATABASE_URL` reaches
   Postgres through the pooler, `AUTH_SECRET_KEY` signs a session, the Durable Object
   is bound, and Supabase Auth answers. Most misconfigurations die here.
4. **A student logs in with a class code.** Proves the path that never touches
   Supabase.
5. **Award a kudos, redeem a reward.** Proves a transaction commits.
6. **An error reaches Sentry**, if the DSN is set. If the browser console shows a
   `Refused to connect` CSP violation instead, the ingest origin and the CSP disagree.

---

## If it goes wrong

```sh
git checkout 29f520b && npm run release      # the pre-rebuild app
```

`29f520b` is the last commit before the v2 merge. Rollback is a deploy like any
other, so it needs the same prompts and the same few minutes — decide quickly rather
than debugging in production.

**A rollback does not undo migrations.** They are additive, so the old code will
tolerate the new schema; that is exactly why "keep migrations additive" matters.

---

## Afterwards

**Run the backup workflow by hand, once.** Actions tab → *Nightly database backup* →
Run workflow. GitHub only runs `schedule` triggers from the default branch, so it has
never fired, and it is currently the only copy of the data outside the live database.
It also needs the `SUPABASE_DB_URL` repository secret, which is the **session** pooler
on port **5432** — not the runtime `DATABASE_URL` on 6543, because `pg_dump` needs
session-level features the transaction pooler does not provide.

Optionally tidy the junk secret, knowing the next release recreates it:

```sh
npx wrangler secret delete TMP_WORKER_CREATED
```

---

## Releases and versioning

**A release is cut after the deploy and its smoke checks, never before.** A tag on
GitHub therefore means "this shipped to classkudos.com and was verified", not "this
was merged". That is the whole point of the ordering: the releases page doubles as
the deploy log, and `git checkout <tag> && npm run release` is a rollback you can
trust because that tag was, at one point, provably running.

**Which number moves.** Majors here have always tracked a platform generation, and
that turns out to be ordinary semver rather than a private convention — each of
those cutovers changed where the data lives, so none of them could be rolled back
by redeploying alone.

| Bump | When | Past examples |
| --- | --- | --- |
| MAJOR | The deploy is a cutover: the data store moves, authentication changes, or the required-secret contract changes — anything where redeploying the previous tag does **not** restore the previous app | `1.x` RedwoodJS → `2.x` RedwoodSDK → `3.x` Supabase Postgres |
| MINOR | A new user-visible capability, or additive schema | `v2.1.0` — Locations |
| PATCH | Bug fixes, documentation, deploy plumbing, dependency bumps | `v2.0.1`, `v2.1.1` |

A MAJOR is the one that costs you something: it is a promise that the release notes
name what an operator has to do by hand, because nothing else will do it for them.

**Conventions.** Tags are `v`-prefixed (`v3.0.0`). Release titles are
`v3.0.0 — Short Name`, so the list sorts by version *and* reads as English. Tags
before `v2.0.1` are bare and two old releases are titled with a name only; they stay
that way — retagging published history breaks every permalink to it and fixes
nothing.

**Cutting one**, once the smoke checks above have passed:

```sh
npm version 3.0.0                    # bumps package.json, commits, tags v3.0.0
git push origin main --follow-tags
gh release create v3.0.0 --title "v3.0.0 — Short Name" --notes-file notes.md --latest
```

`npm version` is what keeps `package.json` and the tag from drifting — they were out
of step from `v2.0.1` to `v2.1.1` because the bump was done by hand, which is to say
not at all. Nothing at runtime reads `package.json` (Sentry is initialised without a
`release` option), so this commit needs no deploy of its own; the tag sitting one
commit ahead of the deployed SHA is expected, and the release notes should say which
SHA actually shipped if the two differ.

---

## Gotchas

**`rm -rf dist` breaks every wrangler command.** `.wrangler/deploy/config.json`
points at `dist/worker/wrangler.json`; if that target is missing, wrangler throws
before doing anything — including the `wrangler secret put` calls inside
`ensure-deploy-env`, which run *before* the build. If you have deleted `dist`, either
`npm run build` first or delete `.wrangler/deploy/` too.

**Never set `RWSDK_RENAME_WORKER=1` (or `RWSDK_RENAME_DB=1`).** Those branches
rewrite `wrangler.jsonc` with `JSON.stringify`, destroying every comment in a heavily
commented file. Nothing needs them here; the worker is already named.

**The `migrations` array in `wrangler.jsonc` must match what Cloudflare has already
applied — check before you edit it.** Migration tags are append-only *history*: an
applied tag is a record of something the platform ran, so rewriting one puts the
config and the account permanently out of step. What that rule does **not** license
is inventing history. The 1.7 rebuild added rwsdk/db's `Database` class to the
existing `v1` and a later commit added a `v2` deleting it again, but no deploy
happened between the two, so Cloudflare never created the class — and the first real
deploy after that died at the API with:

```
✘ [ERROR] A request to the Cloudflare API (/accounts/…/workers/scripts/class-kudos-sdk) failed.
  Cannot apply delete-class migration to class 'Database' which was not exported in
  the previous version of the script [code: 10074]
```

It fails *after* the 60-asset upload, which makes it look like a build or asset
problem. It is not: assets upload before the script PUT, and the script PUT is what
carries the migrations.

The truth lives on the account, not in git. To read it:

```sh
npx wrangler deployments list          # every entry "Secret Change" = the script was never uploaded
npx wrangler versions view <id>        # the bindings the live script actually has
```

and the applied tag itself, which no wrangler command prints:

```sh
TOK=$(grep -m1 '^oauth_token' ~/Library/Preferences/.wrangler/config/default.toml | sed 's/.*= *"//; s/"//')
curl -s -H "Authorization: Bearer $TOK" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/services/class-kudos-sdk" \
  | jq -r '.result.default_environment.script.migration_tag'
```

Here that prints `v1`, and the `v1` Cloudflare ran created exactly one class,
`SessionDurableObject`. The array now says that and nothing else. The next tag to
add, if a Durable Object is ever added or removed for real, is `v2`.

**`npm run seed` is not a deploy step.** It writes demo students and groups, and
against production that is not undoable. It is no longer merely discouraged: in dev
`createHandle()` calls `assertLocalDatabaseUrl`, so a non-local `DATABASE_URL` is
*refused* before a connection is opened — seed included, and any future script that
resolves the same `db` proxy. Getting past it takes `ALLOW_REMOTE_DB=1` in
`.dev.vars`, not in your shell.

**Your local `.dev.vars` is irrelevant to the deploy.** The Worker reads
`wrangler secret` values at runtime. Whether `.dev.vars` points at the local stack or
the online project changes nothing about what ships — verified, not assumed.

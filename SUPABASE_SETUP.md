# Supabase setup

Supabase does exactly two jobs for Class Kudos: it **verifies teacher passwords** and it
**sends teacher emails** — signup confirmations and password resets.

It is not our session system and not our database. All app data lives in `rwsdk/db`
(a SQLite Durable Object). There is no `supabase.from(...)` anywhere in this codebase, no
Postgres tables, and no RLS policies. **Students never touch Supabase at all** — they log
in with a class code checked against our own database.

You can develop the whole app without a Supabase project. Everything except teacher login
and password reset works; `npm run seed` will say so loudly and create a local-only teacher
row.

---

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**.
2. Any region. The free tier is fine — this project stores nothing but teacher auth rows.

## 2. Email provider settings

**Authentication → Sign In / Providers → Email**

- **Allow new users to sign up**: **ON**. Teachers create their own accounts from the
  login page.
- **Confirm email**: **ON**. This is load-bearing, not optional — the whole signup design
  assumes the person who opens the emailed link is the one who owns the mailbox. With it
  off, anyone could create an account for any address.
- **Minimum password length**: **8**, to match `MIN_PASSWORD_LENGTH` in `src/auth/index.ts`.

Turning signups on is safe here because a Supabase account by itself grants nothing. The app
authorizes from its own `users` table, and `loginTeacher` rejects a Supabase-authenticated
user with no local row using the same generic message as a wrong password. A local row is
only ever created *after* an emailed token has been verified.

### Custom SMTP is REQUIRED — signup silently does nothing without it

**Authentication → Emails → SMTP Settings**

Supabase's built-in mail provider **refuses to deliver to any address outside your project
team**, and caps at 2 emails/hour. Without custom SMTP, teacher signup and password reset
will appear to succeed and no email will ever arrive — the app deliberately cannot tell the
difference, because reporting it would leak which addresses have accounts.

Once custom SMTP is configured, raise **Authentication → Rate Limits → emails sent per
hour** above the default.

## 3. Set the redirect URLs

**Authentication → URL Configuration**

- **Site URL**: `https://<your-domain>`
- **Redirect URLs** — add **all four**:
  - `http://localhost:5173/user/reset-password`
  - `https://<your-domain>/user/reset-password`
  - `http://localhost:5173/user/confirm`
  - `https://<your-domain>/user/confirm`

Supabase refuses any `redirectTo` that is not on this allow-list and silently bounces the
reset link to the Site URL instead.

## 4. Copy the keys

**Settings → API Keys** — note this is "API Keys", not the older "API" page.

That screen has TWO TABS, which is the thing that trips people up:

- **API Keys** — the modern keys, `sb_publishable_…` and `sb_secret_…`
- **Legacy API Keys** — the original JWT-format `anon` and `service_role` keys

Use the modern ones. Legacy keys still work but are deprecated by the end of 2026.
The env var names below do not change — only which value you paste into them.

| Where                             | Paste into                  | Secret?                                                   |
| --------------------------------- | --------------------------- | --------------------------------------------------------- |
| Connect dialog → Project URL      | `SUPABASE_URL`              | no                                                        |
| API Keys tab → **publishable** key | `SUPABASE_ANON_KEY`         | no (safe in a browser — we still only use it server-side)  |
| API Keys tab → **secret** key      | `SUPABASE_SERVICE_ROLE_KEY` | **YES — never commit, never send to a browser**            |

The publishable key carries the same low privileges as the old `anon` key, and the secret
key the same elevated access as `service_role`, so nothing about the design below changes.

### The Project URL is NOT a database connection string

`SUPABASE_URL` is the project's **API URL** — `https://<project-ref>.supabase.co`.

The Connect dialog leads with Postgres connection strings, because most projects use
Supabase as their database. This one does not: all app data lives in `rwsdk/db`, and
Supabase is only ever spoken to over the Auth REST API. So none of these are it:

| Shown as             | Looks like                                                    | Use it? |
| -------------------- | ------------------------------------------------------------- | ------- |
| Project URL / API URL | `https://abcdefgh.supabase.co`                                | **yes** |
| Direct connection    | `postgresql://postgres:[PW]@db.abcdefgh.supabase.co:5432/…`    | no      |
| Transaction pooler   | `postgresql://…pooler.supabase.com:6543/…`                     | no      |
| Session pooler       | `postgresql://…pooler.supabase.com:5432/…`                     | no      |

If the plain `https://` URL is not in the Connect dialog, it is under
**Settings → Data API**. Pasting a `postgres://` URI fails fast at startup with an error
that says exactly this.

> **If provisioning fails with a JWT-related error:** `sb_secret_…` keys are deliberately
> NOT JWTs, and older tooling rejects them. This project pins
> `@supabase/supabase-js@2.112.2`, which handles them — but if you hit that error, fall back
> to the `service_role` key from the **Legacy API Keys** tab. It goes in the same env var.

The `service_role` key bypasses every authorization rule in the project. In this codebase it
is confined to `src/lib/supabase.admin.ts`, which begins with `import "server-only"` and is
imported by exactly one file, `src/auth/provision.ts`, which nothing under `src/app/`
imports. Audit it in one command:

```sh
grep -rE "^\s*import .*(supabase\.admin|auth/provision)" src/app   # must print nothing
```

## 5. Local env

This repo symlinks `.dev.vars` → `.env`. Both are git-ignored — never commit real values.
Copy the placeholders from `.env.example`:

```
AUTH_SECRET_KEY=<openssl rand -base64 32>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
# Optional: only needed when the request Host differs from the public URL
# APP_URL=https://<your-domain>
```

## 6. Production secrets

```sh
npx wrangler secret put AUTH_SECRET_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## 7. Create the first teacher

Teachers can sign themselves up from the login page once the steps above are done. But the
FIRST account is a chicken-and-egg problem — and self-signup can never create an ADMIN — so
there are two operator routes in.

**For your real account — no demo data:**

```sh
# add to .dev.vars, run, then DELETE these two lines again
TEACHER_EMAIL=you@school.org
TEACHER_PASSWORD=a-real-password

npm run provision-teacher
```

This creates one teacher and nothing else. Credentials come from `.dev.vars` rather than
the command line so the password stays out of your shell history. Use this one against
anything you care about.

**For a throwaway dev database — teacher plus demo data:**

```sh
npm run seed
SEED_TEACHER_EMAIL=me@example.com SEED_TEACHER_PASSWORD='a-real-password' npm run seed
```

`npm run seed` also creates the "Period 1" group, five fictional students, kudos types,
rewards and locations. Do not run it against production unless you want Ada Lovelace in
your database.

If the Supabase keys are absent the script still seeds a group, students and class codes,
and creates the teacher row with `supabaseUserId = null` — clearly logged. That teacher
**cannot log in** until you re-run the script with the keys present, which links the
existing row in place rather than duplicating it.

## 8. REQUIRED: the reset email template

**Authentication → Email Templates → Reset Password**

> **Password reset will NOT work until you change this.** Supabase's current default is
> the PKCE flow, which emails a `?code=...` link. Completing a `?code=` link requires a
> **browser-side** supabase-js client holding a code verifier in `localStorage`, and this
> app deliberately never constructs one (the anon client is server-side only, with
> `persistSession: false`). A teacher clicking the default link gets the generic
> "Link expired" screen. Set the template body to exactly:
>
> ```
> {{ .SiteURL }}/user/reset-password?token_hash={{ .TokenHash }}&type=recovery
> ```

Once the template is set to `token_hash`, `completePasswordReset` handles both supported
link formats:

- `{{ .SiteURL }}/user/reset-password?token_hash={{ .TokenHash }}&type=recovery` — the
  current default, verified server-side with `auth.verifyOtp`.
- the older implicit flow, which puts `access_token` / `refresh_token` in the URL
  **fragment**. A server can never see a fragment, so the reset page reads
  `window.location.hash` on the client and posts the tokens to the action.

---

## 9. REQUIRED: the confirmation email template

**Authentication → Email Templates → Confirm signup**

Same problem, same fix as the reset template in section 8. Supabase's default
`{{ .ConfirmationURL }}` is verified at Supabase's own endpoint and then redirects with the
result in the URL **fragment** — which a server never sees. This app needs a server-visible
proof of confirmation, because that is the moment it creates the local `users` row and sets
the password. So use the `token_hash` form:

```
{{ .SiteURL }}/user/confirm?token_hash={{ .TokenHash }}&type=signup
```

An HTML body that works:

```html
<h2>Confirm your Class Kudos account</h2>
<p><a href="{{ .SiteURL }}/user/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm my email and choose a password</a></p>
<p>This link expires in 24 hours. If you didn't ask for this, ignore this email — nothing has been created.</p>
```

Check **Authentication → Email → Email OTP Expiration** (default 86400s) matches the
"24 hours" wording.

### Why the signup form has no password field

GoTrue re-sends the confirmation email when someone signs up with an address that already
exists but is unconfirmed — and deliberately does **not** update the stored password. If the
signup form took a password, an attacker could pre-register a teacher's address with their
own password; the real teacher would later "sign up", get confirmed, and never notice their
password was discarded, while the attacker's still worked.

So signup collects a name and email only, and the password is chosen from the emailed link
by whoever actually controls the mailbox. Nothing is written to the local database until
that token is verified — which also means nobody can squat teacher email addresses.

## What is deliberately NOT here

- **No Postgres tables, no RLS, no `supabase.from(...)`.** If you are writing one, you have
  left the intended scope — stop.
- **No student accounts.** Supabase Auth cannot express a class code: `user_metadata` is
  attached *after* authentication and is not a credential, and anonymous users explicitly
  cannot sign back in as the same user once signed out — which is exactly what a class code
  must do.
- **No email provider of our own.** Reset mail is Supabase's. The old app's
  `src/app/lib/email.ts` is not ported.
- **No Supabase JWT is ever stored, forwarded or verified per request.** Teacher login takes
  `data.user.id`, looks up the local row, mints our own rwsdk durable session and discards
  the Supabase client. Supabase is not contacted again for the life of that session.

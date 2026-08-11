-- Failed-login throttling.
--
-- Only FAILURES are recorded for the login scopes. That distinction is
-- load-bearing: a school NATs an entire class behind one public IP, so counting
-- successes would let thirty students signing in at once exhaust a per-IP
-- budget and lock the room out. The one exception is the 'teacher-signup'
-- scope, where account creation itself is what is being rationed, so every
-- attempt is charged.
--
-- Rows are pruned on read, so this table stays small without a cron job.
--
-- All identifiers double-quoted — see the note at the top of 0001.

create table "loginAttempts" (
  "id"        uuid primary key default gen_random_uuid(),
  -- 'student-code' | 'teacher-password' | 'teacher-signup' | 'teacher-confirm'.
  -- Deliberately NOT an enum: RateLimitScope is a TypeScript union whose
  -- members change with application policy, and a new scope should not require
  -- a schema migration. The column is write-only from the app's point of view.
  "scope"     text not null,
  -- Client IP, optionally suffixed with an identifier (e.g. the email for
  -- teacher login) so one attacker cannot spend another user's budget.
  "key"       text not null,
  "createdAt" timestamptz not null default now()
);

-- Backs both the count and the prune.
create index "loginAttempts_scope_key_createdAt_idx"
  on "loginAttempts" ("scope", "key", "createdAt");

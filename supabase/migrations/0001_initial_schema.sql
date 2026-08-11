-- Class Kudos — initial schema (Postgres)
--
-- Translated from the Kysely schema builder that previously lived in
-- src/db/migrations.ts and ran inside a SQLite Durable Object.
--
-- ============================================================================
-- EVERY IDENTIFIER IS DOUBLE-QUOTED, DELIBERATELY.
--
-- The schema is camelCase. Postgres folds *unquoted* identifiers to lower case,
-- while Kysely quotes them by default — so `db.selectFrom("classCodes")` emits
-- "classCodes" and will fail against a table created as unquoted classCodes
-- (which Postgres stores as `classcodes`). The failure appears at RUNTIME, not
-- at build time, and only for the tables you happen not to hit in testing.
--
-- If you edit this file, or run anything by hand in psql or the SQL editor:
-- quote everything.
-- ============================================================================
--
-- Changes from the SQLite original, all deliberate:
--   * integer 0/1 booleans          -> real `boolean`
--   * ISO-8601 text timestamps      -> `timestamptz`, with `default now()`
--   * text unions + app-side guards -> real enum types
--   * text ids                      -> `uuid`
--   * `users.supabaseUserId` is GONE. For teachers and admins, "users"."id" IS
--     the Supabase `auth.users.id`; for students it is a fresh uuid. That
--     collapses the cross-system join column, and with it the whole
--     "linked to a different Supabase account" failure class.
--
-- Note on defaults: `id` and the timestamps carry defaults, but the application
-- still passes explicit values for now (newId() / new Date()). Moving to
-- database-generated values means adding `.returning("id")` at ~27 call sites
-- and is a separate, independently revertable change.

-- ---------------------------------------------------------------------------
-- Enum types. These replace parseUserRole / parseCodeMode / parseCodeKind in
-- src/db/index.ts, whose justifying comment was "nothing in the database
-- enforces these values". Now something does.
-- ---------------------------------------------------------------------------
create type "user_role" as enum ('ADMIN', 'TEACHER', 'STUDENT');
create type "code_mode" as enum ('shared', 'individual');
create type "code_kind" as enum ('group', 'student');

-- ---------------------------------------------------------------------------
-- users
--
-- Teachers and admins authenticate against Supabase Auth, and their "id" is the
-- auth.users.id. Students have no Supabase user and no credentials at all —
-- they authenticate purely through "classCodes", and their id is a plain uuid.
--
-- There is deliberately NO foreign key to auth.users: it would have to be
-- nullable to admit students, which would reintroduce exactly the nullable
-- cross-system column this design removes.
-- ---------------------------------------------------------------------------
create table "users" (
  "id"        uuid primary key default gen_random_uuid(),
  -- Retained for display/back-compat. NOT a credential, and nullable:
  -- students are created from a roster and do not need one.
  "username"  text unique,
  -- Teacher/admin contact address; also the Supabase login identifier.
  -- ALWAYS STORED LOWERCASE — loginTeacher and requestPasswordReset both
  -- query with a lowercased value and this column is byte-exact unique.
  -- NULL for students.
  "email"     text unique,
  "firstName" text not null,
  "lastName"  text not null,
  "role"      "user_role" not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Phase 7 candidate, left out of the translation on purpose because it is new
-- enforcement rather than a port. Safe to add on a fresh database:
--
--   alter table "users" add constraint "users_role_shape" check (
--     ("role" = 'STUDENT' and "email" is null)
--     or ("role" in ('TEACHER', 'ADMIN') and "email" is not null)
--   );

create index "users_role_idx" on "users" ("role");

-- ---------------------------------------------------------------------------
-- groups (a teacher's class)
--
-- "codeMode" selects which kind of class code this group accepts:
--   'shared'     -> one group-wide code; the student then picks their name.
--   'individual' -> one code per enrollment; logs that student straight in.
-- Switching modes does NOT delete codes of the other kind: the login lookup
-- cross-checks "classCodes"."kind" against "groups"."codeMode", so the other
-- set simply stops working until the teacher switches back.
-- ---------------------------------------------------------------------------
create table "groups" (
  "id"             uuid primary key default gen_random_uuid(),
  "name"           text not null,
  "description"    text not null default '',
  "ownerId"        uuid not null references "users" ("id") on delete cascade,
  "archived"       boolean not null default false,
  "rewardedPoints" integer not null default 0,
  -- nanoid(6), used in the public /travel-log/:groupPublicId URL.
  "publicId"       text not null unique,
  "codeMode"       "code_mode" not null default 'shared',
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);

-- The teacher dashboard's exact query: this owner's non-archived groups.
create index "groups_ownerId_archived_idx" on "groups" ("ownerId", "archived");

-- ---------------------------------------------------------------------------
-- locations (created before enrollments, which reference it)
-- ---------------------------------------------------------------------------
create table "locations" (
  "id"          uuid primary key default gen_random_uuid(),
  "name"        text not null,
  "description" text,
  -- Hex colour for UI display, e.g. '#FF5733'.
  "color"       text,
  "isActive"    boolean not null default true,
  "groupId"     uuid not null references "groups" ("id") on delete cascade,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create index "locations_groupId_idx" on "locations" ("groupId");

-- ---------------------------------------------------------------------------
-- enrollments (user <-> group membership; carries the point balance)
-- ---------------------------------------------------------------------------
create table "enrollments" (
  "id"                uuid primary key default gen_random_uuid(),
  "userId"            uuid not null references "users" ("id") on delete cascade,
  "groupId"           uuid not null references "groups" ("id") on delete cascade,
  "points"            integer not null default 0,
  -- Deleting a location must not delete the enrollment — just clear it.
  "currentLocationId" uuid references "locations" ("id") on delete set null,
  "locationUpdatedAt" timestamptz,
  "createdAt"         timestamptz not null default now(),
  constraint "enrollments_userId_groupId_unique" unique ("userId", "groupId")
);

create index "enrollments_groupId_idx" on "enrollments" ("groupId");
create index "enrollments_userId_idx" on "enrollments" ("userId");
create index "enrollments_currentLocationId_idx"
  on "enrollments" ("currentLocationId");

-- ---------------------------------------------------------------------------
-- classCodes — THE single namespace for every student-facing login code.
--
-- Both group-wide and per-student codes live in this one table, so a submitted
-- string resolves to at most one row. Ambiguity between the two kinds is
-- structurally impossible: one "code" column, one table, one global unique
-- constraint, so the database itself rejects a colliding insert. (The obvious
-- alternative — a code column on "groups" and another on "enrollments" — has
-- two independent unique indexes and therefore permits the same string in
-- both, an ambiguity no application-level care can prevent under concurrent
-- inserts.)
--
--   "enrollmentId" is null      -> kind = 'group'   -> shared code for groupId
--   "enrollmentId" is not null  -> kind = 'student' -> that exact enrollment
--
-- "kind" is derivable from "enrollmentId" but is stored explicitly so a query
-- can filter on it without a NULL test, and so a mismatch is a detectable data
-- error rather than a silent reinterpretation.
-- ---------------------------------------------------------------------------
create table "classCodes" (
  "id"           uuid primary key default gen_random_uuid(),
  -- The printable code. Normalised at write time (uppercase, ambiguous glyphs
  -- excluded) so no LIKE / COLLATE / function call is ever needed.
  -- Stored in plaintext ON PURPOSE — teachers print these on paper.
  "code"         text not null unique,
  -- SHA-256 of the normalised code, domain-separated. This is the column the
  -- login path probes, so the index lookup never touches the secret itself;
  -- the plaintext "code" is then compared in CONSTANT TIME in application code.
  -- It is a lookup key, not a secrecy measure.
  "codeHash"     text not null unique,
  "kind"         "code_kind" not null,
  "groupId"      uuid not null references "groups" ("id") on delete cascade,
  -- NULL => this is the group's shared code.
  "enrollmentId" uuid references "enrollments" ("id") on delete cascade,
  "createdAt"    timestamptz not null default now(),
  -- Set on successful login; drives "this code has never been used" UI.
  "lastUsedAt"   timestamptz
);

-- At most ONE code per enrollment. "enrollmentId" is NULL for every group code
-- and Postgres treats NULLs as distinct in a unique index by default, so this
-- constrains only the per-student rows. Do NOT add `nulls not distinct`.
create unique index "classCodes_enrollmentId_unique"
  on "classCodes" ("enrollmentId");

-- At most ONE shared code per group. PARTIAL unique index — applies only to
-- rows where "enrollmentId" is null, leaving per-student rows unconstrained on
-- "groupId". Native in Postgres; this replaces the one sql.ref() escape hatch
-- that existed in the whole codebase.
create unique index "classCodes_groupId_shared_unique"
  on "classCodes" ("groupId")
  where "enrollmentId" is null;

-- The teacher's "print all codes for this class" view.
create index "classCodes_groupId_idx" on "classCodes" ("groupId");

-- ---------------------------------------------------------------------------
-- kudosTypes (per-group award presets)
-- ---------------------------------------------------------------------------
create table "kudosTypes" (
  "id"      uuid primary key default gen_random_uuid(),
  "name"    text not null,
  "value"   integer not null,
  "groupId" uuid not null references "groups" ("id") on delete cascade
);

create index "kudosTypes_groupId_idx" on "kudosTypes" ("groupId");

-- ---------------------------------------------------------------------------
-- kudos (awarded points ledger)
-- ---------------------------------------------------------------------------
create table "kudos" (
  "id"        uuid primary key default gen_random_uuid(),
  "createdAt" timestamptz not null default now(),
  "name"      text not null default 'Kudos',
  "value"     integer not null default 1,
  "userId"    uuid not null references "users" ("id") on delete cascade,
  "groupId"   uuid not null references "groups" ("id") on delete cascade
);

-- Per-student point totals, and the group activity feed.
create index "kudos_groupId_userId_idx" on "kudos" ("groupId", "userId");
create index "kudos_groupId_createdAt_idx" on "kudos" ("groupId", "createdAt");

-- ---------------------------------------------------------------------------
-- rewards (per-group catalogue)
-- ---------------------------------------------------------------------------
create table "rewards" (
  "id"               uuid primary key default gen_random_uuid(),
  "name"             text not null,
  "cost"             integer not null,
  "responseRequired" boolean not null default false,
  "responsePrompt"   text,
  "groupId"          uuid not null references "groups" ("id") on delete cascade
);

create index "rewards_groupId_idx" on "rewards" ("groupId");

-- ---------------------------------------------------------------------------
-- redeemed (redemption requests; "name"/"cost" are snapshotted so editing or
-- deleting a reward does not rewrite a child's history)
-- ---------------------------------------------------------------------------
create table "redeemed" (
  "id"         uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references "users" ("id") on delete cascade,
  "groupId"    uuid not null references "groups" ("id") on delete cascade,
  "name"       text not null,
  "cost"       integer not null,
  "response"   text,
  "reviewed"   boolean not null default false,
  "reviewedAt" timestamptz,
  "createdAt"  timestamptz not null default now()
);

-- The teacher's pending-approval queue, and a student's own history.
create index "redeemed_groupId_reviewed_idx" on "redeemed" ("groupId", "reviewed");
create index "redeemed_userId_idx" on "redeemed" ("userId");

-- ---------------------------------------------------------------------------
-- locationHistory (travel log)
-- ---------------------------------------------------------------------------
create table "locationHistory" (
  "id"         uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references "users" ("id") on delete cascade,
  "locationId" uuid not null references "locations" ("id") on delete cascade,
  "groupId"    uuid not null references "groups" ("id") on delete cascade,
  "arrivedAt"  timestamptz not null default now(),
  "leftAt"     timestamptz,
  -- Minutes; computed by application code when "leftAt" is set.
  "duration"   integer
);

create index "locationHistory_groupId_userId_idx"
  on "locationHistory" ("groupId", "userId");
create index "locationHistory_locationId_idx"
  on "locationHistory" ("locationId");
create index "locationHistory_groupId_arrivedAt_idx"
  on "locationHistory" ("groupId", "arrivedAt");

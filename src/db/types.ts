import type { ColumnType, Generated } from "kysely";

/**
 * The Postgres schema, hand-written to match `supabase/migrations/*.sql`.
 *
 * This replaces `Database<typeof migrations>` from `rwsdk/db`, which INFERRED
 * the schema by walking the migration builder chain. There is no longer a
 * builder to walk, so the two must now be kept in step by hand. Eleven tables
 * did not justify adding a codegen step to the build; if that ever changes,
 * `kysely-codegen --print` in CI is the drift check.
 *
 * Reading the column types:
 *   Generated<T>   — has a database default, so it is OPTIONAL on insert.
 *                    You may still pass a value, which the app currently does
 *                    for ids and timestamps.
 *   ColumnType<S,I,U> — distinct select / insert / update types.
 */

/** `timestamptz` with `default now()`: comes back as a Date, optional on insert. */
type TimestampDefault = ColumnType<Date, Date | string | undefined, Date | string>;

/** Nullable `timestamptz` with no default. */
type TimestampNull = ColumnType<
  Date | null,
  Date | string | null,
  Date | string | null
>;

/* -------------------------------------------------------------------------- */
/* Enum types.                                                                 */
/*                                                                             */
/* These are the canonical definitions — they mirror the Postgres enums in      */
/* 0001_initial_schema.sql, and `src/db/index.ts` re-exports them from here.    */
/* Because the database enforces the values, a role or mode read from a row     */
/* cannot be anything outside these unions and needs no runtime guard.          */
/* -------------------------------------------------------------------------- */

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type CodeMode = "shared" | "individual";
export type CodeKind = "group" | "student";

/* -------------------------------------------------------------------------- */
/* Tables                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * For TEACHERS and ADMINS, `id` IS the Supabase `auth.users.id`. For STUDENTS
 * it is a plain uuid with no Supabase counterpart. That is why there is no
 * `supabaseUserId` column any more, and no foreign key to `auth.users`.
 */
export interface UsersTable {
  id: Generated<string>;
  /** Display leftover, NOT a credential. Null for students. */
  username: string | null;
  /** Always lowercase. Null for students. */
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: TimestampDefault;
  updatedAt: TimestampDefault;
}

export interface GroupsTable {
  id: Generated<string>;
  name: string;
  description: Generated<string>;
  ownerId: string;
  archived: Generated<boolean>;
  rewardedPoints: Generated<number>;
  /** nanoid(6), used in the public /travel-log/:groupPublicId URL. */
  publicId: string;
  codeMode: Generated<CodeMode>;
  createdAt: TimestampDefault;
  updatedAt: TimestampDefault;
}

export interface LocationsTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  /** Hex colour for UI display, e.g. "#FF5733". */
  color: string | null;
  isActive: Generated<boolean>;
  groupId: string;
  createdAt: TimestampDefault;
  updatedAt: TimestampDefault;
}

export interface EnrollmentsTable {
  id: Generated<string>;
  userId: string;
  groupId: string;
  points: Generated<number>;
  currentLocationId: string | null;
  locationUpdatedAt: TimestampNull;
  createdAt: TimestampDefault;
}

/**
 * The single namespace for every student-facing login code.
 * `enrollmentId is null` => the group's shared code; otherwise a per-student code.
 */
export interface ClassCodesTable {
  id: Generated<string>;
  /** Plaintext ON PURPOSE — teachers print these on paper. */
  code: string;
  /** SHA-256 of the normalised code. The column the login path probes. */
  codeHash: string;
  kind: CodeKind;
  groupId: string;
  enrollmentId: string | null;
  createdAt: TimestampDefault;
  lastUsedAt: TimestampNull;
}

export interface KudosTypesTable {
  id: Generated<string>;
  name: string;
  value: number;
  groupId: string;
}

export interface KudosTable {
  id: Generated<string>;
  createdAt: TimestampDefault;
  name: Generated<string>;
  value: Generated<number>;
  userId: string;
  groupId: string;
}

export interface RewardsTable {
  id: Generated<string>;
  name: string;
  cost: number;
  responseRequired: Generated<boolean>;
  responsePrompt: string | null;
  groupId: string;
}

/** `name` and `cost` are snapshotted so editing a reward cannot rewrite history. */
export interface RedeemedTable {
  id: Generated<string>;
  userId: string;
  groupId: string;
  name: string;
  cost: number;
  response: string | null;
  reviewed: Generated<boolean>;
  reviewedAt: TimestampNull;
  createdAt: TimestampDefault;
}

export interface LocationHistoryTable {
  id: Generated<string>;
  userId: string;
  locationId: string;
  groupId: string;
  arrivedAt: TimestampDefault;
  leftAt: TimestampNull;
  /** Minutes; computed by application code when `leftAt` is set. */
  duration: number | null;
}

export interface LoginAttemptsTable {
  id: Generated<string>;
  /**
   * Deliberately `string`, not the `RateLimitScope` union: scopes are
   * application policy and adding one must not require a schema migration.
   * `src/auth/rateLimit.ts` owns the legal values.
   */
  scope: string;
  key: string;
  createdAt: TimestampDefault;
}

/**
 * The database interface handed to Kysely. Keys are the QUOTED table names as
 * they exist in Postgres — camelCase, matching the migrations.
 */
export interface AppDatabase {
  users: UsersTable;
  groups: GroupsTable;
  locations: LocationsTable;
  enrollments: EnrollmentsTable;
  classCodes: ClassCodesTable;
  kudosTypes: KudosTypesTable;
  kudos: KudosTable;
  rewards: RewardsTable;
  redeemed: RedeemedTable;
  locationHistory: LocationHistoryTable;
  loginAttempts: LoginAttemptsTable;
}

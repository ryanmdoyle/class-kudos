import { sql, type Migrations } from "rwsdk/db";

/**
 * Class Kudos — initial rwsdk/db (Kysely over a SQLite Durable Object) schema.
 *
 * SQLite/rwsdk constraints observed throughout:
 *  - No boolean type      -> `integer` holding 0 / 1.
 *  - No date/time type    -> `text` holding an ISO-8601 string (`new Date().toISOString()`).
 *  - No enum type         -> `text` plus a TypeScript union at the mapper boundary:
 *        UserRole  = "ADMIN" | "TEACHER" | "STUDENT"
 *        CodeMode  = "shared" | "individual"      (groups.codeMode)
 *        CodeKind  = "group"  | "student"         (classCodes.kind)
 *  - No `@default(now())` / `@updatedAt` -> timestamps are written explicitly by app code.
 *  - No `@unique` decorator -> explicit `addUniqueConstraint()` / `createIndex().unique()`.
 *
 * IMPORTANT: `up()` MUST return the array of awaited `createTable(...).execute()` results.
 * `Database<typeof migrations>` walks that array to derive the table types; returning nothing
 * (or awaiting the builders outside the returned array) silently yields an EMPTY schema type
 * and every query in the app degrades to untyped. Index creation resolves to `void`, which is
 * not an `ExecutedBuilder`, so indexes are executed after the table array is built and are
 * deliberately NOT part of the returned value.
 *
 * Table creation order matters: a table is created only after every table it references.
 */
export const migrations = {
  "001_initial_schema": {
    async up(db) {
      const tables = [
        // ------------------------------------------------------------------
        // users
        // Teachers/admins authenticate against Supabase; `supabaseUserId` is the
        // ONLY auth column and is the join key back from a Supabase user id to a
        // local row. Students have no Supabase user and no credentials at all —
        // they authenticate purely through `classCodes`.
        // ------------------------------------------------------------------
        await db.schema
          .createTable("users")
          .addColumn("id", "text", (col) => col.primaryKey())
          // Supabase auth user id. NULL for every student. UNIQUE so a Supabase
          // user maps to at most one local row. SQLite treats NULLs as distinct,
          // so any number of students may hold NULL.
          .addColumn("supabaseUserId", "text")
          // Retained from the legacy schema for display/back-compat. NO LONGER A
          // CREDENTIAL, and nullable: students are created from a roster and do
          // not need one.
          .addColumn("username", "text")
          // Teacher/admin contact address; also the Supabase login identifier.
          // ALWAYS STORED LOWERCASE. NULL for students.
          .addColumn("email", "text")
          .addColumn("firstName", "text", (col) => col.notNull())
          .addColumn("lastName", "text", (col) => col.notNull())
          // UserRole union: "ADMIN" | "TEACHER" | "STUDENT"
          .addColumn("role", "text", (col) => col.notNull())
          // ISO-8601 strings, set explicitly in application code.
          .addColumn("createdAt", "text", (col) => col.notNull())
          .addColumn("updatedAt", "text", (col) => col.notNull())
          .addUniqueConstraint("users_supabaseUserId_unique", ["supabaseUserId"])
          .addUniqueConstraint("users_username_unique", ["username"])
          .addUniqueConstraint("users_email_unique", ["email"])
          .execute(),

        // ------------------------------------------------------------------
        // groups (a teacher's class)
        // `codeMode` selects which kind of class code is accepted for this group:
        //   "shared"     -> one group-wide code; student then picks their name.
        //   "individual" -> one code per enrollment; logs that student straight in.
        // Switching modes does NOT delete codes of the other kind: the login
        // lookup cross-checks classCodes.kind against groups.codeMode, so the
        // other set simply stops working until the teacher switches back.
        // ------------------------------------------------------------------
        await db.schema
          .createTable("groups")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("name", "text", (col) => col.notNull())
          .addColumn("description", "text", (col) => col.notNull().defaultTo(""))
          .addColumn("ownerId", "text", (col) =>
            col.notNull().references("users.id").onDelete("cascade"),
          )
          // boolean -> integer 0/1
          .addColumn("archived", "integer", (col) => col.notNull().defaultTo(0))
          .addColumn("rewardedPoints", "integer", (col) =>
            col.notNull().defaultTo(0),
          )
          // nanoid(6), used in the public /travel-log/:groupPublicId URL.
          .addColumn("publicId", "text", (col) => col.notNull())
          // CodeMode union: "shared" | "individual"
          .addColumn("codeMode", "text", (col) =>
            col.notNull().defaultTo("shared"),
          )
          .addColumn("createdAt", "text", (col) => col.notNull())
          .addColumn("updatedAt", "text", (col) => col.notNull())
          .addUniqueConstraint("groups_publicId_unique", ["publicId"])
          .execute(),

        // ------------------------------------------------------------------
        // locations (created before enrollments: enrollments.currentLocationId
        // references it)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("locations")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("name", "text", (col) => col.notNull())
          .addColumn("description", "text")
          // Hex colour for UI display, e.g. "#FF5733".
          .addColumn("color", "text")
          .addColumn("isActive", "integer", (col) => col.notNull().defaultTo(1))
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .addColumn("createdAt", "text", (col) => col.notNull())
          .addColumn("updatedAt", "text", (col) => col.notNull())
          .execute(),

        // ------------------------------------------------------------------
        // enrollments (user <-> group membership; carries the point balance)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("enrollments")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("userId", "text", (col) =>
            col.notNull().references("users.id").onDelete("cascade"),
          )
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .addColumn("points", "integer", (col) => col.notNull().defaultTo(0))
          // Deleting a location must not delete the enrollment — just clear it.
          .addColumn("currentLocationId", "text", (col) =>
            col.references("locations.id").onDelete("set null"),
          )
          .addColumn("locationUpdatedAt", "text")
          .addColumn("createdAt", "text", (col) => col.notNull())
          .addUniqueConstraint("enrollments_userId_groupId_unique", [
            "userId",
            "groupId",
          ])
          .execute(),

        // ------------------------------------------------------------------
        // classCodes — THE single namespace for every student-facing login code.
        //
        // Both group-wide codes and per-student codes live in this one table, so
        // one submitted string can resolve to at most one row. Ambiguity between
        // the two kinds is structurally impossible: there is exactly one `code`
        // column in exactly one table under a single global UNIQUE constraint,
        // so the database itself rejects a colliding insert. (The obvious
        // alternative — a `code` column on `groups` and another on `enrollments`
        // — has two independent unique indexes and therefore permits the same
        // string in both, an ambiguity no application-level care can prevent
        // under concurrent inserts.)
        //
        //   enrollmentId IS NULL  -> kind = "group"   -> shared code for groupId
        //   enrollmentId NOT NULL -> kind = "student" -> that exact enrollment
        //
        // `kind` is derivable from `enrollmentId`, but is stored explicitly so a
        // query can filter on it without a NULL test and so a mismatch is a
        // detectable data error rather than a silent reinterpretation.
        // ------------------------------------------------------------------
        await db.schema
          .createTable("classCodes")
          .addColumn("id", "text", (col) => col.primaryKey())
          // The printable code. Normalised at write time (uppercase, ambiguous
          // glyphs excluded) so no LIKE / COLLATE / function call is ever needed.
          // Stored in plaintext ON PURPOSE — teachers print these on paper.
          .addColumn("code", "text", (col) => col.notNull())
          // SHA-256 of the normalised code, domain-separated. This is the column
          // the login path probes, so the index lookup never touches the secret
          // itself; the plaintext `code` is then compared in CONSTANT TIME in app
          // code. It is a lookup key, not a secrecy measure.
          .addColumn("codeHash", "text", (col) => col.notNull())
          // CodeKind union: "group" | "student"
          .addColumn("kind", "text", (col) => col.notNull())
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          // NULL => this is the group's shared code.
          .addColumn("enrollmentId", "text", (col) =>
            col.references("enrollments.id").onDelete("cascade"),
          )
          .addColumn("createdAt", "text", (col) => col.notNull())
          // Set on successful login; drives "this code has never been used" UI.
          .addColumn("lastUsedAt", "text")
          // The single global namespace guarantee.
          .addUniqueConstraint("classCodes_code_unique", ["code"])
          // The login path's index. Redundant with the above by construction
          // (the hash is deterministic) but it is the constraint that actually
          // backs the lookup, and it makes the invariant explicit.
          .addUniqueConstraint("classCodes_codeHash_unique", ["codeHash"])
          .execute(),

        // ------------------------------------------------------------------
        // kudosTypes (per-group award presets)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("kudosTypes")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("name", "text", (col) => col.notNull())
          .addColumn("value", "integer", (col) => col.notNull())
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .execute(),

        // ------------------------------------------------------------------
        // kudos (awarded points ledger)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("kudos")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("createdAt", "text", (col) => col.notNull())
          .addColumn("name", "text", (col) => col.notNull().defaultTo("Kudos"))
          .addColumn("value", "integer", (col) => col.notNull().defaultTo(1))
          .addColumn("userId", "text", (col) =>
            col.notNull().references("users.id").onDelete("cascade"),
          )
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .execute(),

        // ------------------------------------------------------------------
        // rewards (per-group catalogue)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("rewards")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("name", "text", (col) => col.notNull())
          .addColumn("cost", "integer", (col) => col.notNull())
          .addColumn("responseRequired", "integer", (col) =>
            col.notNull().defaultTo(0),
          )
          .addColumn("responsePrompt", "text")
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .execute(),

        // ------------------------------------------------------------------
        // redeemed (reward redemption requests; name/cost are snapshotted so
        // editing or deleting a reward does not rewrite history)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("redeemed")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("userId", "text", (col) =>
            col.notNull().references("users.id").onDelete("cascade"),
          )
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .addColumn("name", "text", (col) => col.notNull())
          .addColumn("cost", "integer", (col) => col.notNull())
          .addColumn("response", "text")
          .addColumn("reviewed", "integer", (col) => col.notNull().defaultTo(0))
          .addColumn("reviewedAt", "text")
          .addColumn("createdAt", "text", (col) => col.notNull())
          .execute(),

        // ------------------------------------------------------------------
        // locationHistory (travel log)
        // ------------------------------------------------------------------
        await db.schema
          .createTable("locationHistory")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("userId", "text", (col) =>
            col.notNull().references("users.id").onDelete("cascade"),
          )
          .addColumn("locationId", "text", (col) =>
            col.notNull().references("locations.id").onDelete("cascade"),
          )
          .addColumn("groupId", "text", (col) =>
            col.notNull().references("groups.id").onDelete("cascade"),
          )
          .addColumn("arrivedAt", "text", (col) => col.notNull())
          .addColumn("leftAt", "text")
          // Minutes; computed by app code when `leftAt` is set.
          .addColumn("duration", "integer")
          .execute(),
      ];

      // ---------------------------------------------------------------------
      // Indexes. `createIndex().execute()` resolves to `void`, not an
      // `ExecutedBuilder`, so these run after the table array and are NOT
      // returned — including them would contribute nothing to type inference.
      // ---------------------------------------------------------------------

      // users: teacher login joins from a Supabase user id to a local row.
      await db.schema
        .createIndex("users_role_idx")
        .on("users")
        .column("role")
        .execute();

      // groups: teacher dashboard lists a teacher's non-archived groups.
      await db.schema
        .createIndex("groups_ownerId_archived_idx")
        .on("groups")
        .columns(["ownerId", "archived"])
        .execute();

      // enrollments: roster by group, and "who is at this location".
      await db.schema
        .createIndex("enrollments_groupId_idx")
        .on("enrollments")
        .column("groupId")
        .execute();
      await db.schema
        .createIndex("enrollments_userId_idx")
        .on("enrollments")
        .column("userId")
        .execute();
      await db.schema
        .createIndex("enrollments_currentLocationId_idx")
        .on("enrollments")
        .column("currentLocationId")
        .execute();

      // classCodes: at most ONE code per enrollment. `enrollmentId` is NULL for
      // every group code and SQLite treats NULLs as distinct, so this unique
      // index constrains only the per-student rows.
      await db.schema
        .createIndex("classCodes_enrollmentId_unique")
        .unique()
        .on("classCodes")
        .column("enrollmentId")
        .execute();

      // classCodes: at most ONE shared code per group. PARTIAL unique index —
      // it applies only to rows where `enrollmentId IS NULL`, i.e. the group
      // codes, leaving per-student rows unconstrained on `groupId`.
      // Compiles to:
      //   create unique index "classCodes_groupId_shared_unique"
      //     on "classCodes" ("groupId") where "enrollmentId" is null
      await db.schema
        .createIndex("classCodes_groupId_shared_unique")
        .unique()
        .on("classCodes")
        .column("groupId")
        .where(sql.ref("enrollmentId"), "is", null)
        .execute();

      // classCodes: teacher "print all codes for this class" view.
      await db.schema
        .createIndex("classCodes_groupId_idx")
        .on("classCodes")
        .column("groupId")
        .execute();

      // kudosTypes / rewards / locations: everything is scoped by group.
      await db.schema
        .createIndex("kudosTypes_groupId_idx")
        .on("kudosTypes")
        .column("groupId")
        .execute();
      await db.schema
        .createIndex("rewards_groupId_idx")
        .on("rewards")
        .column("groupId")
        .execute();
      await db.schema
        .createIndex("locations_groupId_idx")
        .on("locations")
        .column("groupId")
        .execute();

      // kudos: per-student point totals, and the group activity feed.
      await db.schema
        .createIndex("kudos_groupId_userId_idx")
        .on("kudos")
        .columns(["groupId", "userId"])
        .execute();
      await db.schema
        .createIndex("kudos_groupId_createdAt_idx")
        .on("kudos")
        .columns(["groupId", "createdAt"])
        .execute();

      // redeemed: the teacher's pending-approval queue, and a student's history.
      await db.schema
        .createIndex("redeemed_groupId_reviewed_idx")
        .on("redeemed")
        .columns(["groupId", "reviewed"])
        .execute();
      await db.schema
        .createIndex("redeemed_userId_idx")
        .on("redeemed")
        .column("userId")
        .execute();

      // locationHistory: travel log queries.
      await db.schema
        .createIndex("locationHistory_groupId_userId_idx")
        .on("locationHistory")
        .columns(["groupId", "userId"])
        .execute();
      await db.schema
        .createIndex("locationHistory_locationId_idx")
        .on("locationHistory")
        .column("locationId")
        .execute();
      await db.schema
        .createIndex("locationHistory_groupId_arrivedAt_idx")
        .on("locationHistory")
        .columns(["groupId", "arrivedAt"])
        .execute();

      // DO NOT REMOVE OR REORDER: the schema type is derived from this value.
      return tables;
    },

    async down(db) {
      // Reverse dependency order: children before the tables they reference.
      // Dropping a table drops its indexes with it in SQLite.
      await db.schema.dropTable("locationHistory").ifExists().execute();
      await db.schema.dropTable("redeemed").ifExists().execute();
      await db.schema.dropTable("rewards").ifExists().execute();
      await db.schema.dropTable("kudos").ifExists().execute();
      await db.schema.dropTable("kudosTypes").ifExists().execute();
      await db.schema.dropTable("classCodes").ifExists().execute();
      await db.schema.dropTable("enrollments").ifExists().execute();
      await db.schema.dropTable("locations").ifExists().execute();
      await db.schema.dropTable("groups").ifExists().execute();
      await db.schema.dropTable("users").ifExists().execute();
    },
  },

  // --------------------------------------------------------------------------
  // 002 — failed-login throttling.
  //
  // Only FAILURES are recorded. That distinction is load-bearing: a school NATs
  // an entire class behind one public IP, so counting successes would let 30
  // students logging in at once exhaust a per-IP budget and lock out the room.
  // Rows are pruned on read, so this table stays small without a cron.
  // --------------------------------------------------------------------------
  "002_login_attempts": {
    async up(db) {
      const tables = [
        await db.schema
          .createTable("loginAttempts")
          .addColumn("id", "text", (col) => col.primaryKey())
          // "student-code" | "teacher-password" — separate budgets, since the
          // two have very different legitimate traffic shapes.
          .addColumn("scope", "text", (col) => col.notNull())
          // Client IP, optionally suffixed with an identifier (e.g. the email
          // for teacher login) so one attacker cannot spend another user's budget.
          .addColumn("key", "text", (col) => col.notNull())
          .addColumn("createdAt", "text", (col) => col.notNull())
          .execute(),
      ];

      await db.schema
        .createIndex("idx_loginAttempts_scope_key_createdAt")
        .on("loginAttempts")
        .columns(["scope", "key", "createdAt"])
        .execute();

      // DO NOT REMOVE OR REORDER: the schema type is derived from this value.
      return tables;
    },

    async down(db) {
      await db.schema.dropTable("loginAttempts").ifExists().execute();
    },
  },
} satisfies Migrations;

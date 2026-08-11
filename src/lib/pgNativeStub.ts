/**
 * Stub for `pg-native`, aliased in `vite.config.mts`.
 *
 * `pg` ships two client implementations. The pure-JS one is what runs on
 * Cloudflare Workers (it picks up `CloudflareSocket` from `pg-cloudflare` in
 * `pg/lib/stream.js`). The other is a libpq binding loaded by
 * `pg/lib/native/client.js`, which does a bare `require('pg-native')`.
 *
 * That require is only ever reached through the `pg.native` API, which this
 * codebase never touches — but the bundler resolves it statically, so without a
 * stub the worker build fails outright with:
 *
 *     Could not resolve "pg-native" imported by "pg". Is it installed?
 *
 * Installing the real `pg-native` would be the wrong fix: it is a native addon
 * that cannot run in workerd at all.
 *
 * This throws rather than exporting an empty object, so that if anyone ever does
 * reach for `pg.native` they get an explanation instead of a mystifying
 * `undefined is not a constructor`.
 */

const message =
  "pg-native is not available on Cloudflare Workers — it is a native libpq " +
  "addon. Use the pure-JS pg client (the default); it talks to Postgres over " +
  "pg-cloudflare's socket implementation. See src/lib/pgNativeStub.ts.";

export default class PgNativeUnavailable {
  constructor() {
    throw new Error(message);
  }
}

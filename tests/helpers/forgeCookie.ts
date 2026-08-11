import { createHmac, randomUUID } from "node:crypto";

/**
 * Mint session cookies by hand, for negative-path tests only.
 *
 * rwsdk's cookie format (node_modules/rwsdk/dist/runtime/lib/auth/session.js):
 *
 *   value  = btoa(`${uuid}:${hmacSha256Hex(uuid, AUTH_SECRET_KEY)}`)
 *   cookie = `session_id=<value>; Path=/; HttpOnly; SameSite=Lax`
 *
 * Verified against a live login: the Set-Cookie value base64-decodes to
 * `<uuid>:<64 hex chars>` and carries no Max-Age.
 *
 * ==========================================================================
 * THIS CANNOT MINT A VALID SESSION, AND MUST NOT TRY.
 *
 * A signature is only half of it: `load()` derives a Durable Object id from the
 * uuid and reads the session out of that DO's SQLite. A forged uuid addresses an
 * EMPTY object, which rwsdk reports as `ErrorResponse(401, "Invalid session id")`
 * — the same way an expired one does.
 *
 * So a correctly-signed forgery exercises "signature fine, session absent", and
 * a deliberately mis-signed one exercises "signature rejected". Both are real
 * branches of `loadAuthContext`'s self-heal path, and neither grants access.
 * ==========================================================================
 */

function encode(sessionId: string, signature: string): string {
  return Buffer.from(`${sessionId}:${signature}`, "utf8").toString("base64");
}

function sign(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(sessionId).digest("hex");
}

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET_KEY is not set in the test environment.\n" +
        "  vitest.config.mts passes it through from .env; check it is present there.",
    );
  }
  return secret;
}

/**
 * A cookie whose HMAC does not verify.
 *
 * Drives the branch where `sessions.load()` throws `ErrorResponse(401, "Invalid
 * session id")` and `loadAuthContext` catches it, clears the cookie and
 * continues anonymously — rather than 500-ing.
 */
export function forgeMisSignedCookie(): string {
  const sessionId = randomUUID();
  return encode(sessionId, "0".repeat(64));
}

/**
 * A correctly-signed cookie for a session that was never written.
 *
 * Distinguishes "bad signature" from "signature fine, no such session" — the
 * shape an expired or revoked session takes on a cold Durable Object read.
 */
export function forgeUnknownSessionCookie(): string {
  const sessionId = randomUUID();
  return encode(sessionId, sign(sessionId, requireSecret()));
}

/** Structural garbage: not even base64 of `uuid:signature`. */
export function forgeMalformedCookie(): string {
  return Buffer.from("not-a-session-at-all", "utf8").toString("base64");
}

/** Split a real cookie value into its parts, for assertions about format. */
export function decodeSessionCookie(
  value: string,
): { sessionId: string; signature: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return {
    sessionId: decoded.slice(0, separator),
    signature: decoded.slice(separator + 1),
  };
}

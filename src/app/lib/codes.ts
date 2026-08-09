/**
 * Class codes — pure primitives. No database, no env, no request context, so
 * this module is safe to import from a client component for display formatting.
 * The DB-backed issuing helpers live in `@/auth/classCodes`.
 *
 * These are passwords typed by children, usually copied off a printed page,
 * often on a shared classroom device. Every decision below follows from that:
 *
 *  - The alphabet excludes every glyph pair that is misread in print:
 *    0/O, 1/I/L, and U (Crockford drops U to avoid accidental words). 30 symbols.
 *  - Input is normalised aggressively (case, whitespace, hyphens, stray
 *    punctuation) because a nine-year-old will type "abc def.".
 *  - Codes are looked up by SHA-256 digest and only then compared in constant
 *    time. The digest is a LOOKUP KEY, not a secrecy measure — the plaintext is
 *    stored right next to it because teachers must be able to print these. What
 *    it buys is that the database index probe never touches the plaintext
 *    secret, so the one comparison that does is genuinely the constant-time one.
 */

/** 30 symbols. No 0, O, 1, I, L, or U. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export const GROUP_CODE_LENGTH = 6;
export const STUDENT_CODE_LENGTH = 6;

const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

const ALPHABET_SET = new Set(CODE_ALPHABET.split(""));

/**
 * Cryptographically random code with rejection sampling.
 *
 * 256 % 30 === 16, so bytes >= 240 are discarded rather than folded, which would
 * otherwise make the first 16 symbols of the alphabet ~6% more likely.
 */
export function generateCode(length: number = GROUP_CODE_LENGTH): string {
  if (length < MIN_CODE_LENGTH || length > MAX_CODE_LENGTH) {
    throw new Error(
      `Class code length must be between ${MIN_CODE_LENGTH} and ${MAX_CODE_LENGTH} (got ${length}).`,
    );
  }

  const size = CODE_ALPHABET.length;
  const ceiling = 256 - (256 % size); // 240
  const buffer = new Uint8Array(length * 2);
  let out = "";

  while (out.length < length) {
    crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && out.length < length; i++) {
      const byte = buffer[i]!;
      if (byte >= ceiling) continue;
      out += CODE_ALPHABET[byte % size];
    }
  }

  return out;
}

/**
 * Canonical form of anything a child types.
 *
 * Uppercases, then strips everything that is not A-Z0-9 — which removes spaces,
 * hyphens, the trailing period, and smart quotes. Characters that survive but
 * are not in the alphabet (0, O, 1, I, L, U) are LEFT IN PLACE so the code simply
 * fails `isWellFormedCode` rather than silently shifting into a different valid
 * code.
 */
export function normalizeCode(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isWellFormedCode(
  code: string,
  expectedLength?: number,
): boolean {
  if (expectedLength != null) {
    if (code.length !== expectedLength) return false;
  } else if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) {
    return false;
  }

  for (const char of code) {
    if (!ALPHABET_SET.has(char)) return false;
  }

  return true;
}

/** "ABCDEF" -> "ABC-DEF". Display only; normalizeCode strips the hyphen out. */
export function formatCodeForDisplay(code: string): string {
  const normalized = normalizeCode(code);
  if (normalized.length < 6) return normalized;
  const split = Math.ceil(normalized.length / 2);
  return `${normalized.slice(0, split)}-${normalized.slice(split)}`;
}

/**
 * Indexed lookup key for a code. Domain-separated so these digests are not
 * interchangeable with any other hash in the system. Normalises internally so a
 * caller can never desync the stored key from the compared plaintext.
 */
export async function hashCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(
    `classkudos:code:v1:${normalizeCode(code)}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison.
 *
 * Runs over max(len(a), len(b)) and folds the length difference into the
 * accumulator so it never short-circuits on a length mismatch.
 */
export function constantTimeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a ?? "");
  const bBytes = encoder.encode(b ?? "");

  let diff = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length, 1);

  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

export type UniqueCodeOptions = {
  length?: number;
  /**
   * Returns true if the candidate code already exists. Injected so this module
   * stays database-free.
   */
  isTaken: (code: string) => Promise<boolean>;
  maxAttempts?: number;
};

/** Generate one code that is not already in use. */
export async function generateUniqueCode({
  length = GROUP_CODE_LENGTH,
  isTaken,
  maxAttempts = 12,
}: UniqueCodeOptions): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateCode(length);
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error(
    `Could not generate a unique ${length}-character class code after ${maxAttempts} attempts. ` +
      `The code space may be saturated — consider increasing the code length.`,
  );
}

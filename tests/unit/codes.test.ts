import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CODE_ALPHABET,
  GROUP_CODE_LENGTH,
  STUDENT_CODE_LENGTH,
  constantTimeEqualString,
  formatCodeForDisplay,
  generateCode,
  generateUniqueCode,
  hashCode,
  isWellFormedCode,
  normalizeCode,
} from "@/app/lib/codes";

/**
 * `src/app/lib/codes.ts` — the class-code primitives.
 *
 * These are pure, but they are not incidental: `hashCode` is the LOOKUP KEY for
 * every row in `classCodes`, so its output is effectively part of the schema.
 * Change the digest and every stored code stops resolving — no error, no
 * migration failure, just children whose codes have silently stopped working.
 * That is why the digest is pinned here as a literal rather than recomputed from
 * the implementation, which would happily agree with itself after a regression.
 */

/** SHA-256 of the literal "classkudos:code:v1:ABCDEF". Computed once, then frozen. */
const GOLDEN_ABCDEF =
  "a383d08290be38ff3d612c943026c23bdb3a8ff01be2d00d10e80715dcb401e8";

const AMBIGUOUS_GLYPHS = ["0", "O", "1", "I", "L", "U"] as const;

describe("hashCode", () => {
  it("matches a frozen golden digest", async () => {
    expect(await hashCode("ABCDEF")).toBe(GOLDEN_ABCDEF);
  });

  /*
   * The domain separator is pinned SEPARATELY from the digest, and independently
   * of the module under test. A refactor that renamed the prefix to, say,
   * "classkudos:code:v2:" would produce a self-consistent implementation whose
   * digests no longer match a single stored row. Recomputing the expected value
   * here with node's own hash is what makes that a test failure instead of an
   * incident.
   */
  it("is domain-separated by the exact prefix classkudos:code:v1:", async () => {
    const expected = createHash("sha256")
      .update("classkudos:code:v1:ABCDEF")
      .digest("hex");
    expect(expected).toBe(GOLDEN_ABCDEF);
    expect(await hashCode("ABCDEF")).toBe(expected);

    /* And an undomained hash of the same code must NOT collide with it. */
    const undomained = createHash("sha256").update("ABCDEF").digest("hex");
    expect(await hashCode("ABCDEF")).not.toBe(undomained);
  });

  /*
   * hashCode normalises internally, on purpose: a caller that hashed raw input on
   * the write path and normalised input on the read path would desync the stored
   * key from the plaintext it is meant to index. So everything a nine-year-old
   * might type must land on one digest.
   */
  it("is insensitive to case, hyphens, spaces and stray punctuation", async () => {
    const canonical = await hashCode("ABCDEF");
    for (const typed of ["abc-def", " ABC DEF ", "abc def.", "A-B-C-D-E-F"]) {
      expect(await hashCode(typed), typed).toBe(canonical);
    }
  });

  it("returns 64 lowercase hex characters", async () => {
    expect(await hashCode(generateCode())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("normalizeCode", () => {
  it("applies NFKC, uppercases, and strips non-alphanumerics", () => {
    /* Fullwidth forms are what an iPad's Japanese keyboard produces. */
    expect(normalizeCode("ａｂｃ２３４")).toBe("ABC234");
    expect(normalizeCode("abc def.")).toBe("ABCDEF");
    expect(normalizeCode("  a-b_c/d\te\nf  ")).toBe("ABCDEF");
    /* Smart quotes and other punctuation survive NFKC, then get stripped. */
    expect(normalizeCode("“ABC”—DEF")).toBe("ABCDEF");
    expect(normalizeCode("")).toBe("");
  });

  /*
   * THE IMPORTANT ONE. Normalisation could plausibly "helpfully" map the
   * ambiguous glyphs onto their alphabet twins (O->0 is impossible since 0 is
   * also excluded, but I->J, L->1, U->V are the sort of thing someone adds).
   * It must not: a typo would then become a DIFFERENT WELL-FORMED CODE, which
   * could be another class's or another child's. Leaving the glyph in place means
   * the code fails isWellFormedCode and the child is told to check it.
   */
  it("leaves ambiguous glyphs in place so they fail validation instead of aliasing", () => {
    expect(normalizeCode("0o1il-u")).toBe("0O1ILU");
    expect(isWellFormedCode(normalizeCode("0o1il-u"))).toBe(false);

    for (const glyph of AMBIGUOUS_GLYPHS) {
      const typed = `ABCDE${glyph}`;
      expect(normalizeCode(typed), typed).toBe(typed.toUpperCase());
      expect(isWellFormedCode(normalizeCode(typed)), typed).toBe(false);
    }
  });
});

describe("isWellFormedCode", () => {
  it("accepts a generated code and rejects every ambiguous glyph", () => {
    expect(isWellFormedCode("ABCDEF")).toBe(true);
    for (const glyph of AMBIGUOUS_GLYPHS) {
      expect(isWellFormedCode(`ABCD${glyph}F`), glyph).toBe(false);
    }
  });

  it("enforces the 6..10 length window when no expected length is given", () => {
    expect(isWellFormedCode("ABCDE")).toBe(false); /* 5 */
    expect(isWellFormedCode("ABCDEF")).toBe(true); /* 6 */
    expect(isWellFormedCode("ABCDEFGHJK")).toBe(true); /* 10 */
    expect(isWellFormedCode("ABCDEFGHJKM")).toBe(false); /* 11 */
  });

  it("honours expectedLength exactly", () => {
    expect(isWellFormedCode("ABCDEF", GROUP_CODE_LENGTH)).toBe(true);
    expect(isWellFormedCode("ABCDEF", STUDENT_CODE_LENGTH)).toBe(true);
    expect(isWellFormedCode("ABCDEFG", GROUP_CODE_LENGTH)).toBe(false);
    expect(isWellFormedCode("ABCDE", GROUP_CODE_LENGTH)).toBe(false);
    /*
     * Pinned deliberately: expectedLength REPLACES the 6..10 window rather than
     * narrowing it, so a 4-character expectation would validate. Every caller
     * passes GROUP_CODE_LENGTH or STUDENT_CODE_LENGTH (both 6), so nothing
     * reaches this branch today — but if a shorter code length is ever
     * introduced, this is the line that says the range check will not stop it.
     */
    expect(isWellFormedCode("ABCD", 4)).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isWellFormedCode("")).toBe(false);
  });
});

describe("generateCode", () => {
  /*
   * The rejection-sampling contract (bytes >= 240 discarded, not folded) cannot be
   * observed as a distribution in a fast test, but its structural half can: no
   * byte is ever mapped outside the 30-symbol alphabet. 200 codes is 1200
   * symbols, which makes an accidental `%` over a 32- or 36-symbol table — or a
   * reintroduced 0/O/1/I/L/U — a certainty rather than a coin flip.
   */
  it("emits only alphabet characters, and never an ambiguous glyph", () => {
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(GROUP_CODE_LENGTH);
      for (const char of code) used.add(char);
    }

    const alphabet = new Set(CODE_ALPHABET.split(""));
    expect([...used].filter((c) => !alphabet.has(c))).toEqual([]);
    for (const glyph of AMBIGUOUS_GLYPHS) {
      expect(used.has(glyph), glyph).toBe(false);
    }
    /* 1200 draws from 30 symbols: seeing fewer than all 30 would itself be a bug. */
    expect(used.size).toBe(CODE_ALPHABET.length);
  });

  it("honours the requested length across the whole legal window", () => {
    for (let length = 6; length <= 10; length++) {
      expect(generateCode(length)).toHaveLength(length);
    }
  });

  it("refuses lengths outside 6..10 with an actionable message", () => {
    expect(() => generateCode(5)).toThrow(
      "Class code length must be between 6 and 10 (got 5).",
    );
    expect(() => generateCode(11)).toThrow(
      "Class code length must be between 6 and 10 (got 11).",
    );
    expect(() => generateCode(0)).toThrow(/must be between 6 and 10/);
  });
});

describe("constantTimeEqualString", () => {
  /*
   * This is the ONE comparison in the code path that touches a plaintext secret
   * (the digest lookup happens first), so short-circuiting is the whole thing to
   * guard against. The length mismatch cases matter most: the naive fix for
   * differing lengths is an early return, which is exactly the timing oracle.
   */
  it("compares equal, unequal, mismatched-length and empty inputs", () => {
    expect(constantTimeEqualString("ABCDEF", "ABCDEF")).toBe(true);
    expect(constantTimeEqualString("ABCDEF", "ABCDEG")).toBe(false);
    expect(constantTimeEqualString("ABCDEF", "ABCDEFG")).toBe(false);
    expect(constantTimeEqualString("ABCDEFG", "ABCDEF")).toBe(false);
    expect(constantTimeEqualString("", "")).toBe(true);
    expect(constantTimeEqualString("", "A")).toBe(false);
    expect(constantTimeEqualString("A", "")).toBe(false);
  });

  it("does not treat a differing prefix as a match", () => {
    expect(constantTimeEqualString("ZBCDEF", "ABCDEF")).toBe(false);
  });
});

describe("formatCodeForDisplay", () => {
  it("hyphenates in the middle and round-trips through normalizeCode", () => {
    expect(formatCodeForDisplay("ABCDEF")).toBe("ABC-DEF");
    expect(normalizeCode(formatCodeForDisplay("ABCDEF"))).toBe("ABCDEF");

    /* Odd lengths split after ceil(n/2). */
    expect(formatCodeForDisplay("ABCDEFG")).toBe("ABCD-EFG");
    expect(normalizeCode(formatCodeForDisplay("ABCDEFG"))).toBe("ABCDEFG");
  });

  it("normalises its input first, so display is idempotent", () => {
    expect(formatCodeForDisplay("abc def.")).toBe("ABC-DEF");
    expect(formatCodeForDisplay(formatCodeForDisplay("ABCDEF"))).toBe("ABC-DEF");
  });

  it("leaves anything shorter than 6 unhyphenated", () => {
    expect(formatCodeForDisplay("ABCDE")).toBe("ABCDE");
    expect(formatCodeForDisplay("")).toBe("");
  });
});

describe("generateUniqueCode", () => {
  it("returns the first untaken candidate and asks about it exactly once", async () => {
    const asked: string[] = [];
    const code = await generateUniqueCode({
      isTaken: async (candidate) => {
        asked.push(candidate);
        return false;
      },
    });

    expect(isWellFormedCode(code, GROUP_CODE_LENGTH)).toBe(true);
    expect(asked).toEqual([code]);
  });

  it("retries past taken candidates", async () => {
    const asked: string[] = [];
    const code = await generateUniqueCode({
      isTaken: async (candidate) => {
        asked.push(candidate);
        return asked.length < 3;
      },
    });

    expect(asked).toHaveLength(3);
    expect(asked[2]).toBe(code);
  });

  /*
   * The saturation message is user-hostile by design (it is for an operator, not a
   * teacher) but it is the only signal that the code space is full, so it is
   * pinned verbatim. Equally important: isTaken must be called maxAttempts times
   * and not one more — an off-by-one here is a retry loop that never terminates
   * against a database.
   */
  it("gives up after maxAttempts with the documented message", async () => {
    let calls = 0;
    await expect(
      generateUniqueCode({
        maxAttempts: 3,
        isTaken: async () => {
          calls++;
          return true;
        },
      }),
    ).rejects.toThrow(
      "Could not generate a unique 6-character class code after 3 attempts. " +
        "The code space may be saturated — consider increasing the code length.",
    );
    expect(calls).toBe(3);
  });

  it("passes the requested length through to generateCode", async () => {
    const code = await generateUniqueCode({ length: 8, isTaken: async () => false });
    expect(isWellFormedCode(code, 8)).toBe(true);
  });
});

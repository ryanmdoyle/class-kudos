import { createFromReadableStream } from "react-server-dom-webpack/client.edge";

/**
 * Decode an RSC flight payload in plain Node.
 *
 * The response body of an action request is a `text/x-component` stream whose
 * root row is `{ node, actionResult }`. We use React's own decoder rather than a
 * hand-rolled parser, because real payloads are not line-delimited JSON. A
 * captured one looks like:
 *
 *   :N1786382552224
 *   1:[["Object.fetch","/…/src/worker.tsx",192,10,190,1,true]]
 *   0:{"node":[null,["$","div",null,{"id":"rwsdk-app-end"},null,"$1",1]],"actionResult":{"ok":true}}
 *
 * Note the row with an EMPTY id, the `$1` reference into row 1, and the `$D`
 * (Date), `$W` (Set), `$undefined` and `$$`-escape markers that appear in
 * richer results. Text rows (`T<hexlen>,…`) may even contain raw newlines, so
 * splitting on "\n" is not sound in general. React handles all of it; a
 * reimplementation would be a permanent maintenance liability for no gain.
 *
 * `extractActionResult` below is kept as a NARROW fallback, used only when the
 * real decoder throws, so that a surprise in the wire format produces a readable
 * assertion instead of an opaque one.
 */

/**
 * A moduleMap that answers for ANY client-reference id.
 *
 * With an empty moduleMap, a single "use client" component in a rendered page
 * makes the decode throw:
 *
 *   Could not find the module "/src/x.tsx" in the React Server Consumer Manifest
 *
 * 52 files in this repo carry that directive, so any payload that includes a
 * real page render would fail. We normally avoid that entirely by sending
 * `x-rsc-data-only: true` — but that only nulls the page when the action result
 * is not `undefined`, so the guarantee is not absolute. Stubbing the map keeps a
 * decode failure from masquerading as an action failure.
 */
const permissiveModuleMap = new Proxy({} as never, {
  get: (_target, id) =>
    new Proxy({} as never, {
      get: (_t, name) => ({
        id: String(id),
        chunks: [],
        name: String(name),
        async: true,
      }),
    }),
});

const globals = globalThis as unknown as {
  __webpack_require__?: unknown;
  __webpack_chunk_load__?: unknown;
};
globals.__webpack_require__ ??= () => ({
  __esModule: true,
  default: () => null,
});
globals.__webpack_chunk_load__ ??= async () => {};

export type FlightRoot = {
  /**
   * The rendered page, or `[null, <marker div>]` when `x-rsc-data-only` nulled
   * it.
   *
   * IMPORTANT: this is never `null` itself. `renderToRscStream` always wraps the
   * page in a Fragment alongside a `<div id="rwsdk-app-end">` marker, so a
   * suppressed page shows up as `node[0] === null`, not `node === null`.
   * Verified against a live payload.
   */
  node: unknown;
  actionResult?: unknown;
};

export async function decodeFlight(
  body: ReadableStream<Uint8Array>,
): Promise<FlightRoot> {
  /* Keep a second copy so a decode failure can report the raw payload. */
  const [primary, spare] = body.tee();

  let decoded: FlightRoot | undefined;
  let primaryError: unknown;

  try {
    decoded = (await createFromReadableStream(primary, {
      serverConsumerManifest: {
        moduleMap: permissiveModuleMap,
        moduleLoading: null,
      },
    })) as FlightRoot;
  } catch (error) {
    primaryError = error;
  }

  if (decoded !== undefined) {
    void spare.cancel().catch(() => {});
    return decoded;
  }

  const text = await new Response(spare).text();
  try {
    return { node: undefined, actionResult: extractActionResult(text) };
  } catch (fallbackError) {
    throw new Error(
      "flight decode failed.\n" +
        `  react decoder: ${errorMessage(primaryError)}\n` +
        `  fallback:      ${errorMessage(fallbackError)}\n` +
        `  payload (first 800 chars): ${text.slice(0, 800)}`,
    );
  }
}

/** True when the page was NOT rendered — see the note on `FlightRoot.node`. */
export function pageWasSuppressed(root: FlightRoot): boolean {
  return Array.isArray(root.node) && root.node[0] === null;
}

/**
 * An action that returns (or throws) a `Response` does NOT produce that HTTP
 * status. `normalizeActionResult` flattens it into this shape and the response
 * is a normal 200 `text/x-component`. Verified live: posting an action with no
 * `Origin` header yields
 * `{"__rw_action_response":{"status":403,"headers":{"location":null}}}`.
 */
export type ActionResponseResult = {
  __rw_action_response: {
    status: number;
    headers: { location: string | null };
  };
};

export function asActionResponse(
  result: unknown,
): { status: number; location: string | null } | null {
  if (typeof result !== "object" || result === null) return null;
  const wrapped = (result as ActionResponseResult).__rw_action_response;
  if (!wrapped || typeof wrapped.status !== "number") return null;
  return { status: wrapped.status, location: wrapped.headers?.location ?? null };
}

/* -------------------------------------------------------------- the fallback */

/**
 * Row-0-only flight parser. Runs ONLY when React's decoder throws.
 *
 * Deliberately narrow: it handles numeric references, `$D`, `$undefined`, the
 * numeric sentinels and `$$`-escapes, and THROWS on any other marker rather
 * than guessing. Guessing would turn a wire-format change into a wrong
 * assertion, which is worse than a loud failure.
 */
export function extractActionResult(payload: string): unknown {
  const rows = new Map<string, string>();
  for (const line of payload.split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    rows.set(line.slice(0, separator), line.slice(separator + 1));
  }

  const root = rows.get("0");
  if (!root || !/^[[{]/.test(root)) {
    throw new Error("no JSON row 0 in payload");
  }

  const resolving = new Set<string>();

  const revive = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (value === "$undefined") return undefined;
      if (value.startsWith("$$")) return value.slice(1);
      if (value.startsWith("$D")) return new Date(value.slice(2));
      if (value === "$NaN") return Number.NaN;
      if (value === "$Infinity") return Number.POSITIVE_INFINITY;
      if (value === "$-Infinity") return Number.NEGATIVE_INFINITY;
      if (value === "$-0") return -0;

      const reference = /^\$([0-9a-f]+)$/i.exec(value);
      if (reference) {
        const key = reference[1]!;
        if (resolving.has(key)) throw new Error(`cyclic reference $${key}`);
        const row = rows.get(key);
        if (row == null) throw new Error(`unresolved reference $${key}`);
        if (!/^[[{"]/.test(row)) {
          throw new Error(
            `reference $${key} points at a tagged row (${row[0]}) — needs the React decoder`,
          );
        }
        resolving.add(key);
        try {
          return revive(JSON.parse(row));
        } finally {
          resolving.delete(key);
        }
      }

      if (value.startsWith("$")) {
        throw new Error(`unsupported flight marker ${value.slice(0, 4)}`);
      }
      return value;
    }

    if (Array.isArray(value)) return value.map(revive);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [key, revive(inner)]),
      );
    }
    return value;
  };

  /*
   * Revive ONLY the actionResult subtree, never the whole row.
   *
   * `node` is not this parser's job and cannot be — every rendered element
   * serialises with "$" as its tag, and `renderToRscStream` ALWAYS appends the
   * <div id="rwsdk-app-end"> marker, so row 0's `node` always contains at least
   * one. Reviving the whole row therefore hit `unsupported flight marker $` on
   * every real payload and threw before reaching the result, which made this
   * entire fallback dead code. Only React's decoder can interpret `node`, and the
   * callers that care about the page use `pageWasSuppressed` on the React-decoded
   * root instead.
   */
  const parsed = JSON.parse(root) as Record<string, unknown>;
  if (!("actionResult" in parsed)) {
    throw new Error("row 0 has no actionResult key");
  }
  return revive(parsed.actionResult);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

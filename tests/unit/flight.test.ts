import { describe, expect, it } from "vitest";

import {
  asActionResponse,
  decodeFlight,
  extractActionResult,
  pageWasSuppressed,
} from "../helpers/flight";

/**
 * `tests/helpers/flight.ts` — the decoder every integration assertion passes
 * through.
 *
 * If this drifts, no integration test fails loudly: they all start asserting
 * against `undefined`, and `undefined` compares equal to nothing, so the failures
 * point at the app instead of at the harness. So the decoder is pinned here
 * against a REAL payload captured off the live dev server, byte for byte, with no
 * server and no database in the loop.
 *
 * The payload is worth reading. It is not line-delimited JSON:
 *   - the first row has an EMPTY id and an `N` tag (the render start time),
 *   - row 1 is a stack frame, and row 0 references it as the string `"$1"`,
 *   - `"$D2026-…"` is a Date, not a string.
 * Any hand-rolled split-on-newline parser gets at least one of those wrong.
 */
const CAPTURED_PAYLOAD =
  ':N1786382552224\n' +
  '1:[["Object.fetch","/x/worker.tsx",192,10,190,1,true]]\n' +
  '0:{"node":[null,["$","div",null,{"id":"rwsdk-app-end"},null,"$1",1]],"actionResult":{"ok":true,"redirectTo":"/teacher","when":"$D2026-01-02T03:04:05.678Z"}}\n';

/** Rebuilds the response body as a stream, optionally sliced into small chunks. */
function streamOf(payload: string, chunkSize = payload.length): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(payload);
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
}

describe("decodeFlight", () => {
  it("decodes the captured action payload, revising $D back into a Date", async () => {
    const root = await decodeFlight(streamOf(CAPTURED_PAYLOAD));
    const result = root.actionResult as {
      ok: boolean;
      redirectTo: string;
      when: unknown;
    };

    expect(result.ok).toBe(true);
    expect(result.redirectTo).toBe("/teacher");
    /*
     * `$D` is the marker that makes a naive parser return the string
     * "$D2026-01-02T03:04:05.678Z" and pass a `toContain` check while being
     * completely wrong about the type.
     */
    expect(result.when).toBeInstanceOf(Date);
    expect((result.when as Date).toISOString()).toBe("2026-01-02T03:04:05.678Z");
  });

  /*
   * A real response arrives in whatever chunks the socket produced, and rows
   * (especially `T<hexlen>` text rows) can straddle a boundary. Feeding the same
   * bytes in 7-byte pieces proves the decode is driven by React's buffering
   * rather than by an accident of the whole payload landing in one chunk.
   */
  it("decodes identically when the body arrives in fragments", async () => {
    const root = await decodeFlight(streamOf(CAPTURED_PAYLOAD, 7));
    expect((root.actionResult as { redirectTo: string }).redirectTo).toBe(
      "/teacher",
    );
  });

  it("resolves the $1 reference into row 1 rather than leaving a string", async () => {
    const root = await decodeFlight(streamOf(CAPTURED_PAYLOAD));
    /* node[1] is the marker div element; its debug slot came from row 1. */
    expect(Array.isArray(root.node)).toBe(true);
    expect((root.node as unknown[])[1]).not.toBe("$1");
  });
});

describe("pageWasSuppressed", () => {
  /*
   * `node` is NEVER null itself, however aggressively the page is suppressed:
   * `renderToRscStream` always appends a `<div id="rwsdk-app-end">` marker, so a
   * data-only response is the Fragment `[null, <marker>]`. Verified against this
   * live payload. A check written as `root.node === null` therefore reports
   * "page rendered" for every single response — which is why the helper looks at
   * `node[0]`.
   */
  it("is true for a data-only payload whose node[0] is null", async () => {
    const root = await decodeFlight(streamOf(CAPTURED_PAYLOAD));
    expect(root.node).not.toBeNull();
    expect((root.node as unknown[])[0]).toBeNull();
    expect(pageWasSuppressed(root)).toBe(true);
  });

  it("is false when a page actually rendered, and for a non-array node", () => {
    expect(
      pageWasSuppressed({
        node: [
          ["$", "main", null, {}, null, null, 0],
          ["$", "div", null, { id: "rwsdk-app-end" }, null, null, 1],
        ],
      }),
    ).toBe(false);
    expect(pageWasSuppressed({ node: undefined })).toBe(false);
    expect(pageWasSuppressed({ node: null })).toBe(false);
  });
});

describe("extractActionResult (the fallback parser)", () => {
  /*
   * ==========================================================================
   * This test found a real bug in the harness, and the fix is now in place.
   *
   * The fallback only runs when React's decoder throws, so a green suite never
   * exercises it — which is exactly how it shipped broken. Compared against the
   * real decoder here, it could not parse a real payload AT ALL: `revive` was
   * applied to the whole of row 0, including `node`, and every rendered element
   * serialises with `"$"` as its tag. It hit `unsupported flight marker $` and
   * threw before ever reaching `actionResult`. No payload could have succeeded,
   * because `renderToRscStream` ALWAYS appends the `<div id="rwsdk-app-end">`
   * marker element, so `node` always contains a `"$"`.
   *
   * The fix in tests/helpers/flight.ts: `JSON.parse` row 0, take `actionResult`
   * out FIRST, and revive only that subtree. `node` is not the fallback's job —
   * only React's decoder can interpret it, and callers that care about the page
   * use `pageWasSuppressed` on the React-decoded root.
   *
   * Keep this test as the regression: a fallback that is never reached in a green
   * run has nothing else defending it.
   * ==========================================================================
   */
  it("agrees with the React decoder on the captured payload", async () => {
    const viaReact = (await decodeFlight(streamOf(CAPTURED_PAYLOAD))).actionResult;
    const viaFallback = extractActionResult(CAPTURED_PAYLOAD);

    expect(viaFallback).toEqual(viaReact);
    const result = viaFallback as { ok: boolean; redirectTo: string; when: unknown };
    expect(result.ok).toBe(true);
    expect(result.redirectTo).toBe("/teacher");
    expect(result.when).toBeInstanceOf(Date);
  });

  /*
   * The `node` subtree must be left strictly alone, not merely tolerated. If a
   * future change starts reviving it again, this fails rather than silently
   * reintroducing the throw above.
   */
  it("ignores the node subtree entirely", () => {
    const hostile =
      ':N1\n' +
      '0:{"node":["$","div",null,{"children":"$Zunparseable"},null,"$1",1],' +
      '"actionResult":{"ok":true}}\n';
    expect(extractActionResult(hostile)).toEqual({ ok: true });
  });

  /*
   * What the fallback CAN do today, and the reason it is still worth pinning: on a
   * row 0 whose page was fully nulled it reproduces the React decoder exactly,
   * including `$D` -> Date and the `$1` reference. That is the behaviour the fix
   * above must preserve.
   */
  it("matches the React decoder once node is out of the way", async () => {
    const dataOnly =
      ':N1786382552224\n' +
      '1:[["Object.fetch","/x/worker.tsx",192,10,190,1,true]]\n' +
      '0:{"node":null,"actionResult":{"ok":true,"redirectTo":"/teacher","when":"$D2026-01-02T03:04:05.678Z"}}\n';

    const viaReact = (await decodeFlight(streamOf(dataOnly))).actionResult;
    const viaFallback = extractActionResult(dataOnly) as {
      ok: boolean;
      redirectTo: string;
      when: unknown;
    };

    expect(viaFallback).toEqual(viaReact);
    expect(viaFallback.ok).toBe(true);
    expect(viaFallback.redirectTo).toBe("/teacher");
    expect(viaFallback.when).toBeInstanceOf(Date);
    expect((viaFallback.when as Date).toISOString()).toBe(
      "2026-01-02T03:04:05.678Z",
    );
  });

  /*
   * THROWING on an unknown marker is the whole design of this parser. Guessing —
   * returning "$Z1" as a plain string, say — would turn a wire-format change into
   * a test that fails against the app for the wrong reason, or worse, one that
   * passes.
   */
  it("throws on an unknown marker instead of guessing", () => {
    const payload = '0:{"node":null,"actionResult":{"ok":true,"thing":"$Z1"}}\n';
    expect(() => extractActionResult(payload)).toThrow(
      "unsupported flight marker $Z1",
    );
  });

  it("throws when there is no JSON row 0, or row 0 has no actionResult", () => {
    expect(() => extractActionResult(':N123\n1:[["x"]]\n')).toThrow(
      "no JSON row 0 in payload",
    );
    expect(() => extractActionResult('0:{"node":null}\n')).toThrow(
      "row 0 has no actionResult key",
    );
  });

  it("passes $$-escaped strings through as literal dollar-prefixed text", () => {
    const payload = '0:{"node":null,"actionResult":{"price":"$$5"}}\n';
    expect(extractActionResult(payload)).toEqual({ price: "$5" });
  });
});

describe("asActionResponse", () => {
  /*
   * An action that returns or throws a `Response` does NOT produce that HTTP
   * status — rwsdk flattens it into the payload and the response is a plain 200
   * `text/x-component` (refusal channel 4). Asserting `res.status === 403`
   * against such a response always fails; the status lives here instead.
   */
  it("unwraps a flattened action Response", () => {
    expect(
      asActionResponse({
        __rw_action_response: { status: 403, headers: { location: null } },
      }),
    ).toEqual({ status: 403, location: null });

    expect(
      asActionResponse({
        __rw_action_response: {
          status: 302,
          headers: { location: "/user/login" },
        },
      }),
    ).toEqual({ status: 302, location: "/user/login" });
  });

  it("returns null for an ordinary action result, so it can be used as a probe", () => {
    expect(asActionResponse({ ok: true, redirectTo: "/teacher" })).toBeNull();
    expect(asActionResponse({ success: false, error: "Not found" })).toBeNull();
    expect(asActionResponse(null)).toBeNull();
    expect(asActionResponse(undefined)).toBeNull();
    expect(asActionResponse("403")).toBeNull();
    /* A wrapper without a numeric status is not one of these, either. */
    expect(asActionResponse({ __rw_action_response: { headers: {} } })).toBeNull();
  });
});

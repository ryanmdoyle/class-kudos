/**
 * Types for the two `react-server-dom-webpack` entry points the harness uses.
 *
 * The package ships no declarations, and `@types/react-server-dom-webpack` does
 * not cover the `client.edge` subpath. Declaring them here — rather than casting
 * to `any` at each call site — is what keeps `encodeReply`'s two-shaped return
 * honest: a `string` for plain arguments, a `FormData` when any argument is one.
 * That distinction is load-bearing, because it decides whether rwsdk takes its
 * `req.text()` branch or its `req.formData()` branch.
 *
 * Both are verified to run in plain Node; see tests/helpers/flight.ts.
 */
declare module "react-server-dom-webpack/client.edge" {
  /**
   * Encode action arguments exactly as the browser would.
   *
   * Returns a `string` of JSON for plain serialisable arguments, and a real
   * `FormData` (with `_1_<field>` entries plus a `0: ["$K1"]` reference) when any
   * argument is a FormData or Blob.
   */
  export function encodeReply(
    value: unknown[],
    options?: { temporaryReferences?: unknown },
  ): Promise<string | FormData>;

  /**
   * Decode a flight stream. The options argument is MANDATORY — omitting it
   * throws "Cannot read properties of undefined (reading
   * 'serverConsumerManifest')".
   */
  export function createFromReadableStream<T = unknown>(
    stream: ReadableStream<Uint8Array>,
    options: {
      serverConsumerManifest: {
        moduleMap: unknown;
        moduleLoading: unknown;
      };
    },
  ): Promise<T>;
}

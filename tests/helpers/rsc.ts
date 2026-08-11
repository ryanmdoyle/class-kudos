import { encodeReply } from "react-server-dom-webpack/client.edge";

import { actionId } from "./actions";
import { BASE_URL, ORIGIN } from "./env";
import { asActionResponse, decodeFlight, pageWasSuppressed } from "./flight";

/**
 * The HTTP client for RSC server actions.
 *
 * The recipe, all of it verified against a live dev server:
 *
 *   POST /?__rsc&__rsc_action_id=<urlencoded "/src/…/functions.ts#exportName">
 *   Origin: http://localhost:5173      <- non-GET actions are refused without it
 *   accept: text/x-component
 *   x-rsc-data-only: true              <- suppresses the page render
 *   cf-connecting-ip: 198.51.100.x     <- per-client rate-limit isolation
 *   body: await encodeReply(args)
 *
 * `encodeReply` (from react-server-dom-webpack/client.edge, which runs in plain
 * Node) produces exactly what the browser sends: a JSON string for plain
 * arguments, or a `FormData` when any argument is one. Handing that straight to
 * `fetch` and letting undici pick the Content-Type is what makes the nine
 * FormData actions work with no special casing — `text/plain` takes rwsdk's
 * `req.text()` branch, `multipart/form-data` takes its `req.formData()` branch.
 *
 * DO NOT set Content-Type by hand. That is the one way to break this.
 */

/**
 * Below vitest's 30s testTimeout on purpose. A hung RSC stream (STACK.md trap 3)
 * then surfaces as OUR error, naming the action and the path, rather than as an
 * anonymous test timeout.
 */
const ACTION_TIMEOUT_MS = 20_000;

/* ------------------------------------------------------------------ cookies */

export class CookieJar {
  private jar = new Map<string, string>();

  header(): string | undefined {
    if (this.jar.size === 0) return undefined;
    return [...this.jar].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  /**
   * Apply every Set-Cookie, in order.
   *
   * In practice a login or rotation sends exactly ONE: rwsdk's `save()` and
   * `remove()` both use `headers.set`, which overwrites (see the comment at
   * src/auth/context.ts:125). Verified live — teacherLogin returns a single
   * Set-Cookie. Applying all of them in order is still the right
   * implementation, and is correct if anything ever switches to `append`.
   *
   * `Max-Age=0` or an empty value is a DELETE. This matters: without it, every
   * test after a logout test carries a revoked cookie and 401s in a way that
   * points at the wrong test.
   */
  apply(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = raw.split(";");
      const equals = pair.indexOf("=");
      if (equals < 0) continue;
      const name = pair.slice(0, equals).trim();
      const value = pair.slice(equals + 1).trim();
      const maxAge = attributes
        .map((a) => a.trim().toLowerCase())
        .find((a) => a.startsWith("max-age="))
        ?.slice("max-age=".length);

      if (value === "" || maxAge === "0") this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  get sessionId(): string | undefined {
    return this.jar.get("session_id");
  }

  set(name: string, value: string): void {
    this.jar.set(name, value);
  }

  clone(): CookieJar {
    const copy = new CookieJar();
    copy.jar = new Map(this.jar);
    return copy;
  }
}

/* ------------------------------------------------------------ error surface */

export class ActionHttpError extends Error {
  constructor(
    readonly status: number,
    readonly contentType: string,
    readonly body: string,
    readonly context: { id: string; path: string; ip: string },
  ) {
    super(explain(status, body, context));
    this.name = "ActionHttpError";
  }
}

export class ActionShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionShapeError";
  }
}

/**
 * Turn each non-flight outcome into a sentence naming the cause and the fix.
 * Every row here was observed against the running app, not inferred.
 */
function explain(
  status: number,
  body: string,
  context: { id: string; path: string; ip: string },
): string {
  const head =
    `action ${context.id}\n` +
    `  POSTed to ${context.path} -> HTTP ${status} (not a flight response)\n` +
    `  body: ${body.slice(0, 300)}\n  `;

  if (status === 403 && body.includes("Missing Origin")) {
    return head + "HARNESS BUG: no Origin header was sent.";
  }
  if (status === 403 && body.includes("Origin not allowed")) {
    return (
      head +
      `Origin "${ORIGIN}" does not match the server's own origin. TEST_BASE_URL ` +
      "must match the dev server's host AND port exactly — vite silently binds " +
      "5174 when 5173 is taken, which is why globalSetup passes --strictPort."
    );
  }
  if (status === 401) {
    return (
      head +
      "401 has two possible sources and they look identical over HTTP:\n" +
      "    (a) the action's own guard threw ErrorResponse(401) — requireUser/\n" +
      "        requireStudent, which the student module calls OUTSIDE its try; or\n" +
      "    (b) the isAuthenticated middleware refused, because you POSTed to a\n" +
      "        /student or /teacher path with no session cookie.\n" +
      "  To isolate (a), POST to \"/\" — that path has no auth middleware."
    );
  }
  if (status === 403 && body.trim() === "Forbidden") {
    return (
      head +
      "checkRoleAccess middleware: this session's role is wrong for that path " +
      "prefix (a STUDENT on /teacher, or a teacher on /student)."
    );
  }
  if (status === 405) {
    return head + "This export is a serverQuery (GET-only), not a serverAction.";
  }
  if (status === 302) {
    return (
      head +
      "A middleware short-circuited and THE ACTION NEVER RAN. Check the " +
      "`if (isAction) return;` guard on the middleware for that path (STACK.md trap 3)."
    );
  }
  if (status === 404) {
    return (
      head +
      "That path matches no route. NOTE the action DID still run — rwsdk's router " +
      "calls handleAction() before returning the 404 — but its result was thrown " +
      "away. Assert on database side effects, or POST to a routed path."
    );
  }
  if (status === 500) {
    return (
      head +
      "The worker threw. The real stack trace is in the `vite dev` terminal, not " +
      "here. Run the server yourself with TEST_SERVER=external to watch it."
    );
  }
  if (status === 200) {
    return (
      head +
      "200 but not text/x-component — the `__rsc` query parameter was probably " +
      "missing, so the server rendered an HTML document instead."
    );
  }
  return head + "Unexpected.";
}

/* ------------------------------------------------------------------- client */

export type ActionOptions = {
  /**
   * The URL the action POSTs to. LOAD-BEARING, not cosmetic: an rwsdk action
   * traverses the global middleware chain AND the route middleware of this exact
   * path before `handleAction()` runs.
   *
   * Default "/" — the login page. Its only route middleware is
   * `routeToDashboardByRoleOnLogin`, which returns early for actions, so a 401
   * or 403 from "/" can ONLY have come from the action's own guard. That is what
   * makes "/" the right choice for the authorization sweep.
   *
   * Pass "/teacher/" or "/student/" when the middleware chain IS what you are
   * testing.
   */
  path?: string;
};

export function createClient(options: { ip?: string; jar?: CookieJar } = {}) {
  /*
   * A fresh CF-Connecting-IP per client is the cheapest isolation lever in the
   * suite. Every budget in src/auth/rateLimit.ts is keyed on it through
   * clientKey(), so a unique IP means a private budget — without it, all tests
   * share the bucket "local" and the 10-failures-per-5-minutes
   * teacher-password limit trips partway through a run.
   */
  const ip = options.ip ?? randomTestIp();
  const jar = options.jar ?? new CookieJar();

  async function send(id: string, args: unknown[], o: ActionOptions = {}) {
    const path = o.path ?? "/";
    const url = new URL(path, BASE_URL);
    url.searchParams.set("__rsc", "");
    url.searchParams.set("__rsc_action_id", id); /* '#' gets encoded as %23 */

    const body = await encodeReply(args);

    const headers: Record<string, string> = {
      origin: ORIGIN,
      accept: "text/x-component",
      "x-rsc-data-only": "true",
      "cf-connecting-ip": ip,
    };
    const cookie = jar.header();
    if (cookie) headers.cookie = cookie;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(ACTION_TIMEOUT_MS),
    });
    jar.apply(response);
    return { response, path, id };
  }

  return {
    ip,
    jar,

    /**
     * Call an action and return its decoded result, typed by the caller.
     *
     * Throws ActionHttpError for anything that is not a flight response — which
     * includes an action whose own guard threw. That is deliberate: a thrown
     * guard and a returned refusal are DIFFERENT observable behaviours, and
     * several tests exist precisely to tell them apart.
     */
    async action<T>(
      name: string,
      args: unknown[] = [],
      o?: ActionOptions,
    ): Promise<T> {
      const id = actionId(name);
      const { response, path } = await send(id, args, o);
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("text/x-component")) {
        throw new ActionHttpError(
          response.status,
          contentType,
          await response.text().catch(() => ""),
          { id, path, ip },
        );
      }

      const root = await decodeFlight(response.body!);

      if (!("actionResult" in root)) {
        throw new ActionShapeError(`${id}: flight payload has no actionResult.`);
      }
      if (root.actionResult === undefined) {
        throw new ActionShapeError(
          `${id} resolved to undefined.\n` +
            "  x-rsc-data-only only suppresses the page when actionResult !== undefined,\n" +
            "  so the FULL PAGE was rendered instead. Use rawAction() and assert on the\n" +
            "  database, or give the action a return value.",
        );
      }
      if (!pageWasSuppressed(root)) {
        console.warn(
          `[rsc] ${id}: the page rendered despite x-rsc-data-only — slower, and ` +
            "the payload now contains client references.",
        );
      }

      return root.actionResult as T;
    },

    /**
     * The raw Response, with cookies already applied to the jar.
     *
     * For asserting HTTP-level refusals (401/403/302/404), inspecting headers,
     * and for actions that legitimately resolve to undefined.
     */
    async rawAction(name: string, args: unknown[] = [], o?: ActionOptions) {
      const { response } = await send(actionId(name), args, o);
      return response;
    },

    /** Same, but for an id string that is not a known export name. */
    async rawActionById(id: string, args: unknown[] = [], o?: ActionOptions) {
      const { response } = await send(id, args, o);
      return response;
    },

    /** A plain document GET, for page-level checks. */
    async get(path: string): Promise<Response> {
      const headers: Record<string, string> = { "cf-connecting-ip": ip };
      const cookie = jar.header();
      if (cookie) headers.cookie = cookie;
      const response = await fetch(new URL(path, BASE_URL), {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(ACTION_TIMEOUT_MS),
      });
      jar.apply(response);
      return response;
    },
  };
}

export type Client = ReturnType<typeof createClient>;

export { asActionResponse };

/**
 * Assert that an action was refused at the HTTP level, and return the error.
 *
 * Use this for the thrown-guard cases. It fails with the full diagnostic when
 * the action unexpectedly SUCCEEDS, which is the failure mode that matters.
 */
export async function expectHttpRefusal(
  call: Promise<unknown>,
  expected: { status: number; bodyIncludes?: string },
): Promise<ActionHttpError> {
  let error: unknown;
  try {
    await call;
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ActionHttpError)) {
    throw new Error(
      `expected HTTP ${expected.status}, but the action did not fail at the HTTP level.\n` +
        (error ? `  threw instead: ${String(error)}` : "  it SUCCEEDED."),
    );
  }
  if (error.status !== expected.status) {
    throw new Error(
      `expected HTTP ${expected.status}, got ${error.status}.\n${error.message}`,
    );
  }
  if (expected.bodyIncludes && !error.body.includes(expected.bodyIncludes)) {
    throw new Error(
      `expected body to include ${JSON.stringify(expected.bodyIncludes)}, got ` +
        `${JSON.stringify(error.body.slice(0, 200))}`,
    );
  }
  return error;
}

/**
 * 198.51.100.0/24 is RFC 5737 TEST-NET-2 — reserved for documentation and
 * guaranteed never to be routable, so these can never collide with a real
 * client's rate-limit bucket.
 */
export function randomTestIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
}

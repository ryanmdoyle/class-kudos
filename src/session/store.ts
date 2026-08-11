import { defineDurableSession, type SessionStore } from "rwsdk/auth";
import { IS_DEV } from "rwsdk/constants";

import { appEnv } from "@/lib/env";
import type { Session, SessionInput } from "@/session/durableObject";

export type AppSessionStore = SessionStore<Session, SessionInput>;

let store: AppSessionStore | undefined;

/**
 * Built lazily, not at module scope.
 *
 * `defineDurableSession` reads AUTH_SECRET_KEY out of the environment and throws
 * a bare "No secret key provided for session store" if it is missing. Doing that
 * at module-evaluation time takes the whole worker down with an error that does
 * not say what to do about it. The lazy factory lets us fail on first use with a
 * message that names the variable and where to put it.
 *
 * Under `vite dev` rwsdk substitutes a development key, so local work does not
 * need the variable at all.
 */
function getSessionStore(): AppSessionStore {
  if (store) {
    return store;
  }

  if (!appEnv.AUTH_SECRET_KEY && !IS_DEV) {
    throw new Error(
      "AUTH_SECRET_KEY is not set. Sessions cannot be signed without it.\n" +
        "  Local:      add AUTH_SECRET_KEY=<random string> to .dev.vars\n" +
        "  Production: npx wrangler secret put AUTH_SECRET_KEY\n" +
        "  Generate one with: openssl rand -base64 32",
    );
  }

  store = defineDurableSession({
    sessionDurableObject: appEnv.SESSION_DURABLE_OBJECT,
  });

  return store;
}

/**
 * The app-wide session store.
 *
 * NOTE (rwsdk 1.x): `save` and `remove` take RESPONSE headers.
 * `requestInfo.headers` NO LONGER EXISTS — pass `requestInfo.response.headers`.
 * Prefer the helpers in `@/auth/context` (`rotateSession`, `logoutUser`) over
 * calling these directly; they are the one place that gets this right.
 */
export const sessions = {
  load: (request: Request) => getSessionStore().load(request),
  save: (
    responseHeaders: Headers,
    data: SessionInput,
    options?: { maxAge?: number | true },
  ) => getSessionStore().save(responseHeaders, data, options),
  remove: (request: Request, responseHeaders: Headers) =>
    getSessionStore().remove(request, responseHeaders),
};

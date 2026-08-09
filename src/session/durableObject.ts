import { DurableObject } from "cloudflare:workers";
import { MAX_SESSION_DURATION } from "rwsdk/auth";

/**
 * The shape stored in the session Durable Object.
 *
 * `userId`         - set once the visitor is fully authenticated (student or teacher).
 * `pendingGroupId` - set after a valid SHARED GROUP CODE was entered but before the
 *                    student has picked their name from the roster. It grants nothing
 *                    except the right to list that one group's roster and to finish
 *                    logging in as a member of it. It is NEVER treated as
 *                    authentication: `loadAuthContext` refuses to populate
 *                    `ctx.user` from it.
 *                    (This replaces the legacy WebAuthn-only `challenge` field.)
 */
export interface Session {
  userId?: string | null;
  pendingGroupId?: string | null;
  createdAt: number;
}

/** What callers pass to `sessions.save(...)`. */
export type SessionInput = {
  userId?: string | null;
  pendingGroupId?: string | null;
};

export class SessionDurableObject extends DurableObject {
  private session: Session | undefined = undefined;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.session = undefined;
  }

  async saveSession({
    userId = null,
    pendingGroupId = null,
  }: SessionInput): Promise<Session> {
    const session: Session = {
      userId,
      pendingGroupId,
      createdAt: Date.now(),
    };

    await this.ctx.storage.put<Session>("session", session);
    this.session = session;
    return session;
  }

  async getSession(): Promise<{ value: Session } | { error: string }> {
    if (this.session) {
      return { value: this.session };
    }

    const session = await this.ctx.storage.get<Session>("session");

    if (!session) {
      return { error: "Invalid session" };
    }

    if (session.createdAt + MAX_SESSION_DURATION < Date.now()) {
      await this.revokeSession();
      return { error: "Session expired" };
    }

    this.session = session;
    return { value: session };
  }

  async revokeSession(): Promise<void> {
    await this.ctx.storage.delete("session");
    this.session = undefined;
  }
}

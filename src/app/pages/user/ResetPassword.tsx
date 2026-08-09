"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { finishPasswordReset } from "@/app/pages/user/functions";
import { focusRing } from "@/app/lib/utils";
import { link } from "@/app/shared/links";

/**
 * Where Supabase's password-reset email lands.
 *
 * THIS FILE MUST STAY "use client". Supabase's implicit-flow recovery links put
 * the tokens in the URL **fragment** (`#access_token=…&refresh_token=…`), and a
 * fragment is never sent to the server — only `window.location.hash` can see it.
 * A server component here would render an empty form for half of all projects.
 *
 * Two link shapes are supported, matching the two shapes
 * `completePasswordReset` accepts:
 *   - `?token_hash=…&type=recovery`   (current default; server-verifiable)
 *   - `#access_token=…&refresh_token=…` (legacy implicit flow)
 *
 * The tokens are lifted into React state and then scrubbed out of the address
 * bar, so a live recovery token is not left sitting in the URL to be shoulder-
 * surfed, bookmarked, or handed to the next page in `document.referrer`.
 */

/** Mirrors MIN_PASSWORD_LENGTH in `@/auth` (which is server-only). */
const MIN_PASSWORD_LENGTH = 8;

type ResetCredential = Parameters<typeof finishPasswordReset>[0];

/**
 * Plain `Omit` collapses a union to its COMMON keys, which here is just
 * `newPassword` — so `Omit<ResetCredential, "newPassword">` would be `{}` and
 * every token shape would silently typecheck. Distribute over the union first.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** `{ tokenHash } | { accessToken, refreshToken }` */
type ResetToken = DistributiveOmit<ResetCredential, "newPassword">;

type LinkState =
  | { status: "reading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; credential: ResetToken };

const GENERIC_INVALID =
  "This password reset link is invalid or has expired. Request a new one from the sign-in page.";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <div className="auth-form mx-auto w-full max-w-[440px] px-6 sm:px-10">
        {children}
      </div>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [linkState, setLinkState] = useState<LinkState>({ status: "reading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const hash = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const query = new URLSearchParams(window.location.search);

    const read = (key: string) => hash.get(key) ?? query.get(key);

    // Supabase reports expired/consumed links by redirecting here with an error
    // rather than a token. Surface its own wording — it is about the link the
    // visitor just clicked, not about anybody's account.
    const supabaseError = read("error_description") ?? read("error");

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const tokenHash = query.get("token_hash") ?? hash.get("token_hash");

    // Strip the credential out of the address bar before anything else can read
    // it. Do this even on the error paths — the query string may still carry a
    // partially-used token.
    window.history.replaceState(null, "", window.location.pathname);

    if (supabaseError) {
      setLinkState({
        status: "invalid",
        message: `${supabaseError.replace(/\+/g, " ")} Request a new reset link from the sign-in page.`,
      });
      return;
    }

    if (tokenHash) {
      setLinkState({ status: "ready", credential: { tokenHash } });
      return;
    }

    if (accessToken && refreshToken) {
      setLinkState({
        status: "ready",
        credential: { accessToken, refreshToken },
      });
      return;
    }

    if (query.get("code")) {
      // Supabase's PKCE flow hands back `?code=` and expects the browser to
      // exchange it using a verifier that supabase-js stored in localStorage.
      // We never construct a browser-side Supabase client (by design — the app
      // has one session mechanism, ours), so that exchange is impossible here.
      console.warn(
        "[class-kudos] Received a PKCE-style reset link (?code=). This app " +
          "completes resets server-side and needs the implicit or token_hash " +
          "flow. Set the email template's confirmation URL to " +
          "{{ .SiteURL }}/user/reset-password?token_hash={{ .TokenHash }}&type=recovery " +
          "in the Supabase dashboard (Authentication > Email Templates > Reset Password).",
      );
      setLinkState({ status: "invalid", message: GENERIC_INVALID });
      return;
    }

    setLinkState({ status: "invalid", message: GENERIC_INVALID });
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (linkState.status !== "ready") return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setError(null);
    const { credential } = linkState;

    startTransition(async () => {
      const result = await finishPasswordReset({
        ...credential,
        newPassword: password,
      });

      if (!result.ok) {
        setPassword("");
        setConfirm("");
        setError(result.error);
        return;
      }

      // completePasswordReset mints our own session on success, so this lands
      // the teacher straight on their dashboard.
      window.location.href = result.redirectTo;
    });
  };

  if (linkState.status === "reading") {
    return (
      <Shell>
        <p className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your link…
        </p>
      </Shell>
    );
  }

  if (linkState.status === "invalid") {
    return (
      <Shell>
        <h1 className="mb-4 text-center text-3xl">Link expired</h1>
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>We can&rsquo;t use that link</AlertTitle>
          <AlertDescription>{linkState.message}</AlertDescription>
        </Alert>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="neutral">
            <a href={link("/user/login")}>Back to sign in</a>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-2 text-center text-3xl">Choose a new password</h1>
      <p className="mb-6">
        At least {MIN_PASSWORD_LENGTH} characters. You&rsquo;ll be signed in
        straight afterwards.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              name="new-password"
              type={reveal ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
              disabled={isPending}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setReveal((on) => !on)}
              className={`absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer opacity-70 hover:opacity-100 ${focusRing}`}
              aria-label={reveal ? "Hide password" : "Show password"}
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type={reveal ? "text" : "password"}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

        {confirm.length > 0 && password === confirm && (
          <p className="flex items-center justify-center gap-1.5 text-green-700!">
            <CheckCircle2 className="h-4 w-4" />
            Passwords match
          </p>
        )}

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save new password"
          )}
        </Button>

        {error && (
          <Alert variant="error" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Try again</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      <p className="mt-8">
        <a href={link("/user/login")}>Back to sign in</a>
      </p>
    </Shell>
  );
}

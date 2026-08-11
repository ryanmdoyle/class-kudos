"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import {
  finishTeacherSignup,
  sendPasswordReset,
} from "@/app/pages/user/functions";
import { focusRing } from "@/app/lib/utils";
import { link } from "@/app/shared/links";

/**
 * Where the signup confirmation email lands — and where the password is CHOSEN.
 *
 * The signup form never took a password. GoTrue re-sends confirmation for an
 * existing unconfirmed address without updating its password, so a password
 * captured at signup could be an attacker's. Whoever opens this link is the one
 * who controls the mailbox, so this is the only safe place to set it.
 *
 * The token is consumed on SUBMIT, never on load. Mail scanners and Outlook Safe
 * Links prefetch URLs; verifying on GET would let them burn the link before the
 * teacher ever clicked it.
 *
 * Client component for the same reason as ResetPassword.tsx: implicit-flow links
 * can carry their payload in the URL **fragment**, which the server never sees.
 */

/** Mirrors MIN_PASSWORD_LENGTH in `@/auth` (which is server-only). */
const MIN_PASSWORD_LENGTH = 8;

const GENERIC_INVALID =
  "This confirmation link is invalid, expired, or has already been used. Try signing in, or ask for a new link from the sign-in page.";

type LinkState =
  | { status: "reading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; tokenHash: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <div className="auth-form mx-auto w-full max-w-[440px] px-6 sm:px-10">
        {children}
      </div>
    </AuthLayout>
  );
}

export function ConfirmSignup() {
  const [linkState, setLinkState] = useState<LinkState>({ status: "reading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRequestReset, setCanRequestReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const tokenHash = search.get("token_hash") ?? hash.get("token_hash");

    if (search.get("code") || hash.get("code")) {
      // The PKCE shape. Completing it needs a browser-side supabase-js client
      // holding a code verifier in localStorage, which this app deliberately
      // never constructs. Name the fix rather than failing mutely.
      console.warn(
        "Received a PKCE ?code= confirmation link. Set the Supabase " +
          '"Confirm signup" email template to ' +
          "{{ .SiteURL }}/user/confirm?token_hash={{ .TokenHash }}&type=signup — " +
          "see SUPABASE_SETUP.md.",
      );
    }

    if (!tokenHash) {
      setLinkState({ status: "invalid", message: GENERIC_INVALID });
      return;
    }

    setLinkState({ status: "ready", tokenHash });

    // Do not leave a live token in the address bar to be bookmarked,
    // shoulder-surfed, or leaked through document.referrer.
    window.history.replaceState({}, "", window.location.pathname);
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
      setError("Those passwords don't match.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await finishTeacherSignup({
        tokenHash: linkState.tokenHash,
        password,
      });

      if (!result.ok) {
        setPassword("");
        setConfirm("");
        setError(result.error);
        setCanRequestReset(Boolean(result.canRequestReset));
        return;
      }

      window.location.href = result.redirectTo;
    });
  };

  const requestReset = () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    startTransition(async () => {
      await sendPasswordReset(email);
      setResetSent(true);
    });
  };

  if (linkState.status === "reading") {
    return (
      <Shell>
        <p className="text-center">
          <Loader2 className="inline h-5 w-5 animate-spin" />
        </p>
      </Shell>
    );
  }

  if (linkState.status === "invalid") {
    return (
      <Shell>
        <h1 className="mb-2 text-center text-3xl">Link expired</h1>
        <Alert variant="error" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>We couldn&rsquo;t use that link</AlertTitle>
          <AlertDescription>{linkState.message}</AlertDescription>
        </Alert>
        <div className="mt-8 flex justify-center">
          <Button type="button" variant="neutral" size="sm" asChild>
            <a href={link("/user/login")}>Go to sign in</a>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-2 text-center text-3xl">Choose your password</h1>
      <p className="mb-6">
        Your email is confirmed. Pick a password and you&rsquo;re in.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              name="password"
              type={reveal ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className={`absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer ${focusRing}`}
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-zinc-600">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <Input
            id="signup-confirm"
            name="confirm"
            type={reveal ? "text" : "password"}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up…
            </>
          ) : (
            "Create my account"
          )}
        </Button>

        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>That didn&rsquo;t work</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      {/*
        The account is confirmed and its row exists by the time most of these
        errors can happen, so a reset link is a genuine way out rather than a
        dead end.
      */}
      {canRequestReset && !resetSent && (
        <div className="mt-6 border-t-2 border-border pt-5">
          <p className="mb-2">Email me a sign-in link instead:</p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@school.org"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="neutral"
              onClick={requestReset}
              disabled={isPending}
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {resetSent && (
        <Alert className="mt-6" aria-live="polite">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If that address belongs to a Class Kudos account, a link is on its
            way.
          </AlertDescription>
        </Alert>
      )}
    </Shell>
  );
}

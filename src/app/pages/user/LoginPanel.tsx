"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { CODE_ALPHABET, normalizeCode } from "@/app/lib/codes";
import { focusRing } from "@/app/lib/utils";
import {
  sendPasswordReset,
  studentCodeLogin,
  studentPickName,
  teacherLogin,
  teacherSignup,
} from "@/app/pages/user/functions";
import { link } from "@/app/shared/links";

/* -------------------------------------------------------------------------- */
/* Types — derived from the actions, so this file never imports `@/auth`       */
/* (which is `server-only` and must not appear in the client module graph).    */
/* -------------------------------------------------------------------------- */

type CodeLoginResult = Awaited<ReturnType<typeof studentCodeLogin>>;

export type RosterStudent = Extract<
  CodeLoginResult,
  { next: "CHOOSE_STUDENT" }
>["students"][number];

/**
 * Deliberately narrower than the server's `PendingGroup`: the picker has no use
 * for the group id, and the client is never told it. Step two takes the group
 * from the pending session, so a tampered call can only ever choose a different
 * member of a class whose code the visitor already typed.
 */
export type PendingGroupView = {
  groupName: string;
  students: RosterStudent[];
};

type Tab = "student" | "teacher";
type StudentView = "code" | "picker";
type TeacherView = "login" | "forgot" | "signup" | "signup-sent";

/* -------------------------------------------------------------------------- */
/* Class-code input helpers                                                    */
/* -------------------------------------------------------------------------- */

/** Matches MAX_CODE_LENGTH in `@/app/lib/codes`. */
const MAX_CODE_LENGTH = 10;
/** Both GROUP_CODE_LENGTH and STUDENT_CODE_LENGTH are 6. */
const EXPECTED_CODE_LENGTH = 6;

const ALPHABET = new Set(CODE_ALPHABET.split(""));

/**
 * Characters deliberately absent from the alphabet because they are misread in
 * print. If one of these is typed, the child almost certainly misread the card,
 * and saying so is far more useful than "that code didn't work".
 */
const EXCLUDED_LOOKALIKES = new Set(["0", "O", "1", "I", "L", "U"]);

/**
 * Everything a nine-year-old can plausibly type is accepted: lower case, spaces,
 * the hyphen from the printed "ABC-DEF" form, a trailing full stop, smart
 * quotes. `normalizeCode` is the SAME function the server normalises with, so
 * what you see here is exactly what gets compared.
 */
function cleanCode(raw: string): string {
  return normalizeCode(raw).slice(0, MAX_CODE_LENGTH);
}

/** Redisplay a cleaned code in the printed "ABC-DEF" shape while it is typed. */
function displayCode(clean: string): string {
  if (clean.length > 3 && clean.length <= EXPECTED_CODE_LENGTH) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Purely local checks against the PUBLIC alphabet and length. These say nothing
 * about whether a code exists, so they are not an oracle — but they catch the
 * two mistakes that actually happen in a classroom.
 */
function localCodeProblem(clean: string): string | null {
  if (clean.length === 0) {
    return "Type the code your teacher gave you.";
  }

  const bad = Array.from(new Set(clean.split(""))).filter(
    (char) => !ALPHABET.has(char),
  );

  if (bad.length > 0) {
    const lookalike = bad.some((char) => EXCLUDED_LOOKALIKES.has(char));
    if (lookalike) {
      return `Class codes never use O, 0, I, 1, L or U — they are too easy to mix up. Look at ${bad
        .map((c) => `"${c}"`)
        .join(" and ")} again; it is probably a similar-looking character.`;
    }
    return `${bad.map((c) => `"${c}"`).join(" and ")} ${
      bad.length === 1 ? "is not" : "are not"
    } used in class codes.`;
  }

  if (clean.length < EXPECTED_CODE_LENGTH) {
    return `Class codes are ${EXPECTED_CODE_LENGTH} characters. You have typed ${clean.length}.`;
  }

  return null;
}

/* -------------------------------------------------------------------------- */

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="error" className="mt-4" aria-live="polite">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function LegalFootnote() {
  return (
    <p className="mt-8">
      By signing in you agree to our{" "}
      <a href={link("/legal/terms")}>Terms of Service</a> and{" "}
      <a href={link("/legal/privacy")}>Privacy Policy</a>.
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 of the shared-group-code flow: "tap your name"                       */
/* -------------------------------------------------------------------------- */

function StudentPicker({
  group,
  onStartOver,
}: {
  group: PendingGroupView;
  onStartOver: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A class of 30 fits on one screen as a three-column grid. Only offer the
  // filter box when the roster is genuinely long enough to need hunting.
  const needsFilter = group.students.length > 12;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.students;
    return group.students.filter((student) => {
      const first = student.firstName.toLowerCase();
      const last = student.lastName.toLowerCase();
      return (
        first.startsWith(q) ||
        last.startsWith(q) ||
        `${first} ${last}`.includes(q)
      );
    });
  }, [group.students, query]);

  const pick = (student: RosterStudent) => {
    setError(null);
    setChosenId(student.id);
    startTransition(async () => {
      const result = await studentPickName(student.id);
      if (!result.ok) {
        setChosenId(null);
        setError(result.error);
        return;
      }
      window.location.href = result.redirectTo;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <p className="mb-1 text-center text-sm uppercase tracking-widest">
        {group.groupName}
      </p>
      <h1 className="mb-1 text-center text-3xl">Tap your name</h1>
      <p className="mb-5">That&rsquo;s it — no password needed.</p>

      {needsFilter && (
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-60"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing your name…"
            aria-label="Find your name"
            autoComplete="off"
            className="h-12 pl-9 text-base"
          />
        </div>
      )}

      <div
        className="grid max-h-[46vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
        role="group"
        aria-label="Choose your name"
      >
        {visible.map((student) => (
          <Button
            key={student.id}
            type="button"
            variant="neutral"
            onClick={() => pick(student)}
            disabled={isPending}
            className="h-14 justify-start px-4 text-left text-base leading-tight"
          >
            {chosenId === student.id ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : null}
            <span className="truncate">
              {student.firstName} {student.lastName}
            </span>
          </Button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-4">
          No names match &ldquo;{query}&rdquo;. Check the spelling, or clear the
          box to see everyone.
        </p>
      )}

      {/*
        The likely message here is "Your class code timed out" (the pending
        session lives 10 minutes). The "enter a different code" button below is
        the fix for it, so it stays visible rather than being swapped out.
      */}
      {error && <ErrorAlert title="Let's try that again" message={error} />}

      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          variant="noShadowNeutral"
          size="sm"
          onClick={onStartOver}
          disabled={isPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Wrong class? Enter a different code
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 (and the whole story for per-student codes): the big code box        */
/* -------------------------------------------------------------------------- */

function CodeForm({
  onGroupCode,
}: {
  onGroupCode: (group: PendingGroupView) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const problem = localCodeProblem(code);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await studentCodeLogin(code);

      if (!result.ok) {
        setFailures((n) => n + 1);
        setError(result.error);
        inputRef.current?.select();
        return;
      }

      if (result.next === "CHOOSE_STUDENT") {
        onGroupCode({
          groupName: result.groupName,
          students: result.students,
        });
        return;
      }

      window.location.href = result.redirectTo;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[520px]">
      <h1 className="mb-2 text-center text-4xl">Class Kudos</h1>
      <p className="mb-6 text-base!">Type your class code to sign in.</p>

      <form onSubmit={submit} noValidate>
        <Label htmlFor="class-code" className="sr-only">
          Class code
        </Label>
        <Input
          id="class-code"
          ref={inputRef}
          name="class-code"
          type="text"
          value={displayCode(code)}
          onChange={(event) => {
            setCode(cleanCode(event.target.value));
            if (error) setError(null);
          }}
          placeholder="ABC-DEF"
          aria-label="Class code"
          aria-invalid={error ? true : undefined}
          // Capitals, no autocorrect, no autofill: this is not a word and not a
          // password manager's business.
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          // +1 for the hyphen `displayCode` inserts.
          maxLength={MAX_CODE_LENGTH + 1}
          // Deliberately NOT disabled while the request is in flight: a disabled
          // input cannot be focused or selected, so the `select()` on failure
          // below would silently do nothing and the child would have to reach
          // for the mouse to fix one wrong character.
          className="h-20 text-center font-display text-4xl tracking-[0.2em] uppercase sm:text-5xl"
        />

        <p className="mt-2">
          Lower case, spaces and the dash are all fine.
        </p>

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="mt-5 h-14 w-full text-lg"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking…
            </>
          ) : (
            "Go"
          )}
        </Button>

        {error && (
          <ErrorAlert
            title="Check your code"
            message={
              failures >= 2
                ? `${error} If it still doesn't work, ask your teacher — the code may have been changed.`
                : error
            }
          />
        )}
      </form>

      <LegalFootnote />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Teacher: email + password, verified by Supabase, session minted by us       */
/* -------------------------------------------------------------------------- */

function TeacherForm({
  onForgot,
  onSignup,
}: {
  onForgot: (email: string) => void;
  onSignup: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter both your email address and your password.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await teacherLogin(email, password);
      if (!result.ok) {
        setPassword("");
        setError(result.error);
        return;
      }
      window.location.href = result.redirectTo;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <h1 className="mb-2 text-center text-3xl">Teacher sign in</h1>
      <p className="mb-6">Sign in with your email and password.</p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teacher-email">Email</Label>
          <Input
            id="teacher-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            disabled={isPending}
            placeholder="you@school.org"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teacher-password">Password</Label>
          <Input
            id="teacher-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        {error && <ErrorAlert title="Sign in failed" message={error} />}
      </form>

      <p className="mt-5">
        <button
          type="button"
          onClick={() => onForgot(email)}
          className={`cursor-pointer text-zinc-500 underline hover:text-black ${focusRing}`}
        >
          Forgot your password?
        </button>
      </p>

      <p className="mt-2">
        New here?{" "}
        <button
          type="button"
          onClick={() => onSignup(email)}
          className={`cursor-pointer font-heading text-zinc-500 underline hover:text-black ${focusRing}`}
        >
          Create an account
        </button>
      </p>

      <LegalFootnote />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Teacher: request a Supabase password-reset email                            */
/* -------------------------------------------------------------------------- */

function ForgotPasswordForm({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError(null);
    startTransition(async () => {
      // Always resolves { ok: true }, whatever happened, so this endpoint can
      // never be used to find out which addresses have accounts. The UI must
      // therefore show the same confirmation every time.
      await sendPasswordReset(email);
      setSent(true);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <h1 className="mb-2 text-center text-3xl">Reset your password</h1>

      {sent ? (
        <>
          <Alert className="mt-6" aria-live="polite">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>
              If {email.trim()} belongs to a Class Kudos teacher account, a reset
              link is on its way. It expires after about an hour — check your
              spam folder if it does not arrive.
            </AlertDescription>
          </Alert>

          <div className="mt-8 flex justify-center">
            <Button type="button" variant="neutral" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-6">
            We&rsquo;ll email you a link to choose a new one.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoFocus
                disabled={isPending}
                placeholder="you@school.org"
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            {error && <ErrorAlert title="Hmm." message={error} />}
          </form>

          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="noShadowNeutral"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </div>
        </>
      )}

      <LegalFootnote />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TeacherSignupForm({
  initialEmail,
  onBack,
  onSent,
}: {
  initialEmail: string;
  onBack: () => void;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !firstName.trim()) {
      setError("Please enter your name and email address.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await teacherSignup({ email, firstName, lastName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSent(email.trim());
    });
  };

  return (
    <>
      <h1 className="mb-2 text-center text-3xl">Create a teacher account</h1>
      {/*
        NO PASSWORD FIELD, deliberately. The password is chosen from the link we
        email, by whoever actually controls the mailbox — see the note on
        `signupTeacher`. Anything typed here is unverified.
      */}
      <p className="mb-6">
        We&rsquo;ll email you a link to confirm your address and choose a
        password.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            disabled={isPending}
            placeholder="you@school.org"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="signup-first">First name</Label>
            <Input
              id="signup-first"
              name="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="signup-last">Last name</Label>
            <Input
              id="signup-last"
              name="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              disabled={isPending}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Email me a link"
          )}
        </Button>

        {error && <ErrorAlert title="Couldn't sign up" message={error} />}
      </form>

      <div className="mt-8 flex justify-center">
        <Button type="button" variant="noShadowNeutral" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>
      </div>

      <LegalFootnote />
    </>
  );
}

/* -------------------------------------------------------------------------- */

export function LoginPanel({
  pendingGroup,
  confirmProblem = false,
}: {
  pendingGroup: PendingGroupView | null;
  confirmProblem?: boolean;
}) {
  // Student is always the default tab: the overwhelming majority of visits are
  // children typing a code, and teachers sign in a couple of times a day.
  const [tab, setTab] = useState<Tab>("student");
  const [studentView, setStudentView] = useState<StudentView>(
    pendingGroup ? "picker" : "code",
  );
  const [teacherView, setTeacherView] = useState<TeacherView>("login");
  const [group, setGroup] = useState<PendingGroupView | null>(pendingGroup);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [sentTo, setSentTo] = useState("");

  return (
    <div className="auth-form mx-auto w-full max-w-[560px] px-6 sm:px-10">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="teacher">Teacher</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-6">
          {studentView === "picker" && group ? (
            <StudentPicker
              group={group}
              onStartOver={() => {
                // The stale pending session is harmless: it grants nothing but
                // the right to list this one roster, it expires in 10 minutes,
                // and the next successful code entry replaces it outright.
                setGroup(null);
                setStudentView("code");
              }}
            />
          ) : (
            <CodeForm
              onGroupCode={(next) => {
                setGroup(next);
                setStudentView("picker");
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="teacher" className="mt-6">
          {confirmProblem && teacherView === "login" && (
            <ErrorAlert
              title="That link didn't work"
              message="Your confirmation link was invalid, expired, or already used. Sign in below, or create an account again to get a fresh link."
            />
          )}

          {teacherView === "login" && (
            <TeacherForm
              onForgot={(email) => {
                setTeacherEmail(email);
                setTeacherView("forgot");
              }}
              onSignup={(email) => {
                setTeacherEmail(email);
                setTeacherView("signup");
              }}
            />
          )}

          {teacherView === "forgot" && (
            <ForgotPasswordForm
              initialEmail={teacherEmail}
              onBack={() => setTeacherView("login")}
            />
          )}

          {teacherView === "signup" && (
            <TeacherSignupForm
              initialEmail={teacherEmail}
              onBack={() => setTeacherView("login")}
              onSent={(email) => {
                setSentTo(email);
                setTeacherView("signup-sent");
              }}
            />
          )}

          {teacherView === "signup-sent" && (
            <>
              <h1 className="mb-2 text-center text-3xl">Check your email</h1>
              {/*
                Identical wording whatever happened server-side. `teacherSignup`
                resolves { ok: true } for a new address, an existing one, and a
                send failure alike, so this text must not imply a lookup.
              */}
              <Alert className="mt-6" aria-live="polite">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  If {sentTo} can be used for a new account, a confirmation link
                  is on its way. It expires in 24 hours — check your spam folder
                  if it does not arrive.
                </AlertDescription>
              </Alert>

              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => setTeacherView("login")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

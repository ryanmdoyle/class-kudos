"use client";

import { useEffect, useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  startPasskeyRegistration,
  finishPasskeyReset,
  validateTeacherAccessCode,
} from "./functions";
import { Button } from "@/app/components/ui/button";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { link } from "@/app/shared/links";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { RequestInfo } from "rwsdk/worker"



export function ResetTeacherPasskey({ params }: RequestInfo) {
  const [username, setUsername] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [result, setResult] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (params.code)
      setAccessCode(params.code)
  }, [params])

  const passkeyRegister = async () => {
    // 1. Check for the valid code
    const validatedUser = await validateTeacherAccessCode(username, accessCode)

    if (validatedUser.valid === false || !validatedUser.user) {
      setFormError(`Invalid username or reset code. Please try again.`)
      return;
    };

    const { username: validUsername, firstName, lastName, role, id } = validatedUser.user

    // 2. Get a challenge from the worker
    const options = await startPasskeyRegistration(validatedUser.user.username)
    // 3. Ask the browser to sign the challenge
    const registration = await startRegistration({ optionsJSON: options });

    // 4. Give the signed challenge to the worker to finish the registration process
    const success = await finishPasskeyReset({
      username: validUsername,
      firstName,
      lastName,
      role,
      userId: id,
    }, registration);

    if (!success) {
      setResult("Reset failed");
    } else {
      let count = 5;
      setResult(`Success! Redirecting to Login page in ${count}...`);

      const countdown = setInterval(() => {
        count -= 1;
        setResult(`Success! Redirecting to Login page in ${count}...`);
        if (count <= 0) {
          clearInterval(countdown);
          window.location.href = link("/user/login");
        }
      }, 1000);
    }
  };

  const handlePerformPasskeyRegister = () => {
    const missingFields: string[] = [];
    if (!username.trim()) missingFields.push("First Name");
    if (!accessCode.trim()) missingFields.push("Last Name");

    if (missingFields.length > 0) {
      setFormError(`Please complete missing fields: \n${missingFields.join(", \n")}`);
      return;
    }

    setFormError(null);
    startTransition(() => void passkeyRegister());
  };

  return (
    <AuthLayout>
      <div className="auth-form max-w-[400px] w-full mx-auto px-10">

        <h1 className="page-title text-center">Get a New Passkey</h1>
        <p className="py-6">Enter the code from your email below to register a new Passkey.</p>
        {result && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{result}</AlertTitle>
          </Alert>
        )}
        {formError && (
          <Alert variant="error" className="mb-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Oops!</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <Input
          type="text"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="reset code"
        />
        <Button onClick={handlePerformPasskeyRegister} disabled={isPending} className="w-full">
          {isPending ? <>...</> : "Register with passkey"}
        </Button>
      </div>
    </AuthLayout>
  );
}
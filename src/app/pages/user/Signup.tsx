"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  finishPasskeyRegistration,
  startPasskeyRegistration,
  checkUsernameAvailability,
} from "./functions";
import { Button } from "@/app/components/ui/button";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { link } from "@/app/shared/links";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import debounce from "debounce";
import { UserRole } from "@generated/prisma";


export function Signup() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"" | UserRole>("TEACHER");
  const [result, setResult] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passkeyRegister = async () => {
    // 1. Get a challenge from the worker
    const options = await startPasskeyRegistration(username);

    // 2. Ask the browser to sign the challenge
    const registration = await startRegistration({ optionsJSON: options });

    // 3. Give the signed challenge to the worker to finish the registration process
    const success = await finishPasskeyRegistration({
      username,
      firstName,
      lastName,
      role: role as UserRole, // cast from the 'role' state
      ...(email ? { email: email } : {}), // conditionally include email if role is teacher
    }, registration);

    if (!success) {
      setResult("Registration failed");
    } else {
      window.location.href = link("/user/login");
    }
  };

  const handlePerformPasskeyRegister = () => {
    const missingFields: string[] = [];
    if (role !== UserRole.TEACHER && role !== UserRole.STUDENT) {
      missingFields.push("Role (must be selected)");
    }

    if (!firstName.trim()) missingFields.push("First Name");
    if (!lastName.trim()) missingFields.push("Last Name");
    if (!username.trim()) missingFields.push("Username");
    if (username.trim().length < 3) {
      missingFields.push("Username must be at least 3 characters");
    }

    if (role === UserRole.TEACHER) {
      if (!email.trim()) missingFields.push("Email");
    }

    if (missingFields.length > 0) {
      setFormError(`Please complete missing fields: \n${missingFields.join(", \n")}`);
      return;
    }

    setFormError(null);
    startTransition(() => void passkeyRegister());
  };

  const debouncedCheckUsername = useCallback(
    debounce(async (username: string) => {
      const { taken } = await checkUsernameAvailability(username);
      if (taken) {
        setFormError("Username is already taken.");
      } else {
        setFormError(null)
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (username.length === 0) {
      setFormError(null)
    }

    if (username.length >= 3) {
      debouncedCheckUsername(username);
    }

    // Cleanup on unmount or username change
    return () => {
      debouncedCheckUsername.clear();
    };
  }, [username]);

  return (
    <AuthLayout>
      <div className="absolute top-0 right-0 p-10">
        <a href={link('/user/login')} className="font-display font-bold text-black text-sm underline underline-offset-8 hover:decoration-primary">
          Login
        </a>
      </div>
      <div className="auth-form max-w-[400px] w-full mx-auto px-10">

        <h1 className="page-title text-center pb-6">Create a Teacher Account</h1>
        {/* <p className="py-4">Select your role:</p>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "TEACHER" | "STUDENT")}
          className="outline-2 w-full h-10 pl-2"
        >
          <option value="" disabled>
            Select your role
          </option>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select> */}
        {/* <p className="py-6">Enter a username to setup an account.</p> */}
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <Input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
        />
        <Input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
        />
        {role === UserRole.TEACHER && (
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
        )}
        <Button onClick={handlePerformPasskeyRegister} disabled={isPending} className="w-full">
          {isPending ? <>...</> : "Register with passkey"}
        </Button>
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
      </div>
    </AuthLayout>
  );
}
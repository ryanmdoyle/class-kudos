"use client";

import { useState, useTransition } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { finishPasskeyLogin, startPasskeyLogin, studentAccessCodeLogin } from "./functions";
import { Button } from "@/app/components/ui/button";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { Input } from "@/app/components/ui/input";
import { link } from "@/app/shared/links";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { AlertCircle } from "lucide-react";

export function Login() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"student" | "teacher">("student");


  const passkeyLogin = async () => {
    // 1. Get a challenge from the worker
    const options = await startPasskeyLogin();

    // 2. Ask the browser to sign the challenge
    const login = await startAuthentication({ optionsJSON: options });

    // 3. Give the signed challenge to the worker to finish the login process
    const success = await finishPasskeyLogin(login);

    if (!success) {
      setResult("Login failed");
    } else {
      window.location.href = link("/");
    }
  };

  const handlePerformPasskeyLogin = () => {
    if (!username.trim()) {
      setResult("Please provide your username.");
      return;
    }
    setResult("");
    startTransition(() => void passkeyLogin());
  };

  const handleStudentLogin = () => {
    if (!username.trim() || !code.trim()) {
      setResult("Please provide both username and access code.");
      return;
    }

    setResult("");
    startTransition(async () => {
      const res = await studentAccessCodeLogin(username, code);
      if (!res.success) {
        setResult(res.error ?? "Login failed. Please try again.");
        return;
      }

      // On success, redirect
      window.location.href = link("/student");
    });
  };

  return (
    <AuthLayout>
      <div className="absolute top-0 right-0 p-10">
        <a href={link("/user/signup")} className="font-display font-bold text-black text-sm underline underline-offset-8 hover:decoration-primary">
          Register
        </a>
      </div>
      <div className="auth-form max-w-[600px] w-full mx-auto px-10">
        <h1 className="text-3xl text-center mb-4">Login</h1>
        <Tabs value={tab} onValueChange={(val) => setTab(val as "student" | "teacher")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="teacher">Teacher</TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <Card className="gap-2">
              <CardHeader className="mb-4">
                <CardTitle>Student Login</CardTitle>
                <CardDescription>
                  <strong>Passkey login: </strong>Enter only your username.<br />
                  <strong>Access Code Login: </strong>Enter username and teacher-created access code.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                <Button onClick={handlePerformPasskeyLogin} disabled={isPending} className="w-full mb-6">
                  {isPending ? <>...</> : "Login with passkey"}
                </Button>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Access Code"
                />
                {result && (
                  <Alert variant="error" className="mb-5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Oops!</AlertTitle>
                    <AlertDescription>{result}</AlertDescription>
                  </Alert>
                )}
                <Button onClick={handleStudentLogin} disabled={isPending} className="w-full mb-6">
                  {isPending ? <>...</> : "Login with access code"}
                </Button>
              </CardContent>
              <CardFooter className="flex flex-col">
                <p className="justify-center">
                  <a href={link("/user/what-are-passkeys")}>What are passkeys?</a>
                </p>
                <p className="justify-center">
                  By clicking continue, you agree to our <a href={link("/legal/terms")}>Terms of Service</a> and <a href={link("/legal/privacy")}>Privacy Policy</a>.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="teacher">

            <Card className="gap-2">
              <CardHeader className="mb-4">
                <CardTitle>Teacher Login</CardTitle>
                <CardDescription>Enter your username below to sign-in.</CardDescription>
              </CardHeader>
              <CardContent className="grid">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                {result && (
                  <Alert variant="error" className="mb-5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Oops!</AlertTitle>
                    <AlertDescription>{result}</AlertDescription>
                  </Alert>
                )}

              </CardContent>
              <CardFooter className="flex flex-col">

                <Button onClick={handlePerformPasskeyLogin} disabled={isPending} className="w-full mb-6">
                  {isPending ? <>...</> : "Login with Passkey"}
                </Button>
                <p className="justify-center mb-4">
                  <a href={link("/user/request-passkey")}>Need a new passkey?</a>
                </p>
                <p className="justify-center">
                  By clicking continue, you agree to our <a href={link("/legal/terms")}>Terms of Service</a> and <a href={link("/legal/privacy")}>Privacy Policy</a>.
                </p>
              </CardFooter>
            </Card>

          </TabsContent>
        </Tabs>

      </div>
    </AuthLayout>
  );
}
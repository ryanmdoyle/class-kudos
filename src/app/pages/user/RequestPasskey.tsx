"use client";

import { AuthLayout } from "@/app/layouts/AuthLayout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { link } from "@/app/shared/links";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { startRegistration } from "@simplewebauthn/browser";
import { requestTeacherAccessCode, validateStudentPasskey, finishPasskeyReset, startPasskeyRegistration } from './functions'
import { useState } from "react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/app/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function RequestPasskey() {
  const [tab, setTab] = useState<"student" | "teacher">("student");

  const [studentUsername, setStudentUsername] = useState("");
  const [studentAccessCode, setStudentAccessCode] = useState("");

  const [teacherEmail, setTeacherEmail] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState("");

  const handleStudentRequest = async () => {
    const missing: string[] = [];
    if (!studentUsername.trim()) missing.push("Username");
    if (!studentAccessCode.trim()) missing.push("Reset Code");

    if (missing.length > 0) {
      setFormError(`Please complete missing fields:\n${missing.join(", ")}`);
      return;
    }

    setFormError(null);
    const validated = await validateStudentPasskey(studentUsername, studentAccessCode);
    // set errors for not success
    if (!validated || validated.success === false || !validated.user) {
      if (validated.error) setFormError(validated.error)
      return false
    }

    // Create passkey for validated user
    const { username, firstName, lastName, role, id } = validated.user
    if (validated.success === true) {
      // 1. Get a challenge from the worker
      const options = await startPasskeyRegistration(username)
      // 2. Ask the browser to sign the challenge
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      const success = await finishPasskeyReset({
        username,
        firstName,
        lastName,
        role,
        userId: id,
      }, registration);

      if (!success) {
        setResult("Registration failed");
      } else {
        window.location.href = link("/user/login");
      }
    }
  };

  const handleTeacherRequest = async () => {
    const missing: string[] = [];
    if (!teacherEmail.trim()) missing.push("Email");

    if (missing.length > 0) {
      setFormError(`Please complete missing fields:\n${missing.join(", ")}`);
      return;
    }

    setFormError(null);
    const res = await requestTeacherAccessCode(teacherEmail);
    if (res) {
      setResult("If an account exists with that email, a reset link has been sent.");
    } else {
      setResult("There's been an error, please try again.")
    }
  };

  return (
    <AuthLayout>
      <div className="absolute top-0 right-0 p-10">
        <a
          href={link("/user/login")}
          className="font-display font-bold text-black text-sm underline underline-offset-8 hover:decoration-primary"
        >
          Login
        </a>
      </div>
      <div className="auth-form max-w-[400px] w-full mx-auto px-10">
        <h1 className="text-3xl text-center mb-4">Request a Passkey</h1>
        {/* <Tabs value={tab} onValueChange={(val) => setTab(val as "student" | "teacher")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="teacher">Teacher</TabsTrigger>
          </TabsList> */}

        {/* <TabsContent value="student">
            <Card className="gap-2">
              <CardHeader className="mb-4">
                <CardTitle>Get a Student Passkey</CardTitle>
                <CardDescription>
                  Ask a teacher for a code to get a new passkey, or reset one you've lost. They can make a code from the options page of a group you've enrolled in{" :)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid">
                <div className="grid gap-2">
                  <Label htmlFor="student-username">Username</Label>
                  <Input
                    id="student-username"
                    placeholder="Your current username"
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reset-code">Reset Code</Label>
                  <Input
                    id="reset-code"
                    placeholder="Enter code from teacher"
                    value={studentAccessCode}
                    onChange={(e) => setStudentAccessCode(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleStudentRequest}>
                  Get New Passkey
                </Button>
              </CardFooter>
            </Card>
          </TabsContent> */}

        {/* <TabsContent value="teacher"> */}
        <Card className="gap-2">
          <CardHeader className="mb-4">
            <CardTitle>Get Teacher Passkey</CardTitle>
            <CardDescription>
              Enter the email associated with your account and you'll receive a link to create a new passkey.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid">
            <div className="grid gap-2">
              <Label htmlFor="teacher-email">Email</Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="you@example.com"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleTeacherRequest} type="button">
              Request New Passkey
            </Button>
          </CardFooter>
        </Card>
        {/* </TabsContent>
        </Tabs> */}

      </div>
      {result && (
        <Alert className="m-auto my-4 w-[80%] bg-green-background">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Email Requested</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="error" className="m-auto my-4 w-[80%]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Oops!</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
    </AuthLayout>
  );
}
"use client";

import { Label } from "@radix-ui/react-label";
import { addTeacherEmail } from "./functions";
import { Input } from "../ui/input";

const handleSubmit = async (formData: FormData) => {
  const email = formData.get("email");
  const result = await addTeacherEmail(formData);
  if (result.success) {
    console.log("Front success!")
  } else {
    console.error(result.error);
  }
}

export function AddEmailForm() {
  return (
    <form action={handleSubmit} id="addEmailForm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="m@example.com"
            required
          />
        </div>
      </div>
    </form>
  )
}
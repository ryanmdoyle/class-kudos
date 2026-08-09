import { defineScript } from "rwsdk/worker";
import { db } from "@/db";
import { sessions } from "@/session/store";

export default defineScript(async () => {
  const teacher = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where("role", "=", "TEACHER")
    .executeTakeFirstOrThrow();

  const headers = new Headers();
  await sessions.save(headers, { userId: teacher.id });
  console.log("TEACHER", teacher.id, teacher.email);
  console.log("COOKIE", headers.get("Set-Cookie"));
});

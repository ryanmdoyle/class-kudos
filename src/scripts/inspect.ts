import { defineScript } from "rwsdk/worker";
import { db } from "@/db";

export default defineScript(async () => {
  const groups = await db.selectFrom("groups").selectAll().execute();
  console.log("GROUPS", JSON.stringify(groups));
  const users = await db
    .selectFrom("users")
    .select(["id", "email", "role", "firstName", "lastName"])
    .execute();
  console.log("USERS", JSON.stringify(users));
  const codes = await db.selectFrom("classCodes").selectAll().execute();
  console.log("CODES", JSON.stringify(codes));
  const locs = await db.selectFrom("locations").selectAll().execute();
  console.log("LOCATIONS", JSON.stringify(locs));
});

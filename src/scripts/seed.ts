import { defineScript } from "rwsdk/worker";
import { db, setupDb } from "@/db";
import { env } from "cloudflare:workers";

export default defineScript(async () => {
  await setupDb(env);

  // --- Configuration ---
  const ADMIN_USER_ID = "5bcba760-039d-4ce4-a4c7-f9e47fe316ad";

  // --- Create Users ---
  const users = await Promise.all(
    Array.from({ length: 12 }).map((_, i) => {
      return db.user.create({
        data: {
          username: `student${i + 1}`,
          email: `student${i + 1}@example.com`,
          firstName: `Student`,
          lastName: `Number${i + 1}`,
          role: "STUDENT",
        },
      });
    })
  );

  // --- Create Groups ---
  const groups = await Promise.all(
    ["Red Rockets", "Blue Bears", "Green Gators", "Yellow Yetis"].map(
      (name) =>
        db.group.create({
          data: {
            name,
            description: `${name} description`,
            ownerId: ADMIN_USER_ID,
          },
        })
    )
  );

  // --- Create Enrollments ---
  const enrollmentPromises = users.flatMap((user, idx) => {
    const groupSample = idx % 2 === 0 ? groups.slice(0, 2) : groups.slice(2);
    return groupSample.map((group) =>
      db.enrollment.create({
        data: {
          userId: user.id,
          groupId: group.id,
        },
      })
    );
  });

  await Promise.all(enrollmentPromises);

  console.log("🌱 Finished seeding");
});

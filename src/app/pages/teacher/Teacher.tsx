import type { RequestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { requireTeacher } from "@/auth";
import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";
import { AddGroupButton } from "@/app/components/teacher/AddGroupButton";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";

/**
 * The teacher's group picker.
 *
 * `ownerId` is taken from the session, so this query can only ever return this
 * teacher's own groups — there is no group id in the URL to tamper with.
 */
export async function Teacher({ request }: RequestInfo) {
  const user = requireTeacher();

  const groups = await db
    .selectFrom("groups")
    .select(["id", "name", "rewardedPoints"])
    .where("ownerId", "=", user.id)
    .where("archived", "=", 0)
    .orderBy("name", "asc")
    .execute();

  return (
    <div className="flex flex-col gap-0 min-h-screen min-w-screen">
      <TeacherNav url={request.url} />

      <div className="bg-green-background flex-1 overflow-auto border border-border flex items-center justify-center">
        <div className="bg-background max-w-[500px] w-full mx-auto p-12 neo-container relative">
          <h1 className="text-3xl text-center">Groups</h1>
          <p className="text-center py-6">
            {groups.length > 0 ? "Select" : "Create"} a group to begin.
          </p>
          <ul className="pb-6 flex flex-col gap-2">
            {groups.map((group) => (
              <li key={group.id}>
                <a href={link("/teacher/:groupId", { groupId: group.id })}>
                  <Button variant="gold" className="text-xl font-bold w-full">
                    {group.name}
                  </Button>
                </a>
              </li>
            ))}
          </ul>
          <AddGroupButton />
        </div>
      </div>
    </div>
  );
}

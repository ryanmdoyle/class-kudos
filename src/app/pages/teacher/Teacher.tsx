import { AddGroupButton } from "@/app/components/teacher/AddGroupButton";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";
import { requestInfo } from "rwsdk/worker"
import { db, Group } from "@/db";
import { link } from "@/app/shared/links";

export async function Teacher() {
  const { request, ctx } = requestInfo;

  const groups = await db.group.findMany({
    where: {
      ownerId: ctx.user?.id,
      archived: false,
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="flex flex-col gap-0 min-h-screen min-w-screen">
      <TeacherNav url={request.url} />

      <div className="bg-green-background flex-1 overflow-auto border border-border flex items-center justify-center">
        <div className="bg-background max-w-[500px] w-full mx-auto p-12 neo-container relative">
          <h1 className="text-3xl text-center">Groups</h1>
          <p className="test center py-6">{groups ? 'Select ' : 'Create '}a group to begin.</p>
          <ul className="pb-6">
            {groups && (
              groups.map((group: Group) => (
                <a href={link("/teacher/:groupId", { groupId: group.id })} key={group.id}>
                  <li className="text-xl font-bold mb-2">{group.name}</li>
                </a>
              ))
            )}
          </ul>
          <AddGroupButton />
        </div>
      </div>
    </div>
  )
}
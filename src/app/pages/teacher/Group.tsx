import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import { RequestInfo } from "rwsdk/worker"
import { db } from "@/db";
import { GroupDashboard } from "@/app/components/teacher/GroupDashboard";

export async function Group({ params, request }: RequestInfo) {
  const groupId = params.groupId;

  const group = await db.group.findUnique({ where: { id: params.groupId } });

  const enrollments = await db.enrollment.findMany({
    where: { groupId: groupId },
    include: { user: true }
  });

  const kudoTypes = await db.kudosType.findMany({
    where: { groupId },
    orderBy: { name: "asc" }
  });

  return (
    <div className="flex flex-col h-screen min-w-screen">

      <TeacherNav url={request.url} currentGroup={groupId} />

      <div className="flex-1 overflow-auto">
        {group && <GroupDashboard group={group} initialEnrollments={enrollments} groupKudoTypes={kudoTypes} />}
      </div>
    </div>
  );
}
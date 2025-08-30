import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import { ErrorResponse, RequestInfo } from "rwsdk/worker"
import { db } from "@/db";
import { GroupDashboard } from "@/app/components/teacher/GroupDashboard";

export async function Group({ params, request }: RequestInfo) {
  const groupId = params.groupId;

  const groupData = await db.group.findUnique({
    where: { id: groupId },
    include: {
      enrollments: {
        include: {
          user: true
        },
      },
      KudosType: {
        orderBy: { name: "asc" }
      },
      kudos: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });

  if (!groupData) {
    throw new ErrorResponse(404, "Group Not Found")
  }

  const { enrollments, KudosType: kudoTypes, kudos } = groupData;

  return (
    <div className="flex flex-col h-screen min-w-screen">
      <TeacherNav url={request.url} currentGroup={groupId} />

      <div className="flex-1 overflow-auto">
        <GroupDashboard
          group={groupData}
          initialEnrollments={enrollments}
          groupKudoTypes={kudoTypes}
          initialKudos={kudos}
        />
      </div>
    </div>
  );
}
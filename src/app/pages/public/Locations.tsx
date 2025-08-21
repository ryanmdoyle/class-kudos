import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import { RequestInfo } from "rwsdk/worker"
import { db } from "@/db";
import { StudentTravelLog } from "@/app/components/public/StudentTravelLog"

export async function Locations({ params, request }: RequestInfo) {
  const groupId = params.groupId;

  const enrollments = await db.enrollment.findMany({
    where: { groupId: groupId },
    include: { user: true, currentLocation: true }
  });

  const locations = await db.location.findMany({
    where: { groupId }
  })

  console.log(enrollments, locations)

  return (
    <div className="flex flex-col h-screen min-w-screen">

      <h1>Locations</h1>

      <div className="flex-1 overflow-auto">
        <StudentTravelLog enrollments={enrollments} groupLocations={locations} />
      </div>
    </div>
  );
}
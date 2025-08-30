"user server"

import { RequestInfo } from "rwsdk/worker"
import { db } from "@/db";
import { StudentTravelLog } from "@/app/components/public/StudentTravelLog"

export async function Locations({ params }: RequestInfo) {
  const publicId = params.groupPublicId;

  const group = await db.group.findUnique({
    where: { publicId },
    select: { id: true, publicId: true }
  })

  const enrollments = await db.enrollment.findMany({
    where: { groupId: group?.id },
    include: { user: true, currentLocation: true }
  });

  const locations = await db.location.findMany({
    where: { groupId: group?.id, isActive: true }
  })

  return (
    <div className="flex flex-col h-screen min-w-screen">

      <h1 className="font-display text-2xl center py-6 bg-background">Student Travel Log</h1>

      <div className="flex-1 overflow-auto bg-green-background">
        <StudentTravelLog enrollments={enrollments} groupLocations={locations} />
      </div>
    </div>
  );
}
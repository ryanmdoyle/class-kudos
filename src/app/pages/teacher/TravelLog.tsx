import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { TravelLogTable } from '@/app/components/teacher/TravelLogTable'


export async function TravelLog({ params, request }: RequestInfo) {
  const groupId = params.groupId

  const trips = await db.locationHistory.findMany({
    where: { groupId: groupId },
    orderBy: { arrivedAt: "desc" },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      location: {
        select: {
          name: true
        }
      }
    }
  })

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <div className="h-[100px] flex-shrink-0">
        <TeacherNav url={request.url} currentGroup={groupId} />
      </div>
      <div className="flex-1 overflow-auto flex flex-col gap-4 bg-green-background min-w-screen p-8">
        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Travel Log</h2>
          <TravelLogTable trips={trips} />
        </div>
      </div>
    </div>
  )
}
import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import { RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"


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

  const group = await db.group.findUnique({
    where: { id: groupId }
  })

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <div className="h-[100px] flex-shrink-0">
        <TeacherNav url={request.url} currentGroup={groupId} />
      </div>
      <div className="flex-1 overflow-auto flex flex-col gap-4 bg-green-background min-w-screen p-8">
        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Travel Log</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id} className="bg-background">
                  <TableCell>{trip.user.firstName} {trip.user.lastName}</TableCell>
                  <TableCell>{trip.location.name}</TableCell>
                  <TableCell className="font-base">{new Date(trip.arrivedAt).toLocaleString("en-US", {
                    month: "short",  // Aug
                    day: "numeric",  // 23
                    hour: "numeric", // 12
                    minute: "2-digit", // 32
                    hour12: true,   // AM/PM
                  })}</TableCell>
                </TableRow>

              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
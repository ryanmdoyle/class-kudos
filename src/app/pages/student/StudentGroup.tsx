import { StudentNav } from "@/app/components/student/StudentNav"
import { RequestInfo } from "rwsdk/worker"
import { db } from "@/db";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"

export async function StudentGroup({ ctx, params, request }: RequestInfo) {

  const groupId = params.groupId;

  if (!ctx.user) {
    throw new Error("User not found in context");
  }

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_groupId: {
        userId: ctx.user.id,
        groupId: groupId,
      },
    },
    include: { user: true }
  })

  const kudos = await db.kudos.findMany({
    where: {
      userId: ctx.user.id,
      groupId: groupId,
    }
  })

  return (
    <div className="flex flex-col h-screen min-w-screen">

      <StudentNav url={request.url} currentGroup={groupId} />

      <div className="flex-1 overflow-auto bg-green-background relative p-4">
        <div className="w-full h-full gap-4 flex flex-col">
          {/* Student Name & Points */}
          <div className="p-4 w-[800px] h-[100px] bg-background neo-container flex justify-between items-center m-auto">
            <h1 className="text-3xl w-full">
              {enrollment?.user.firstName} {enrollment?.user.lastName}
            </h1>
            <div className="flex items-center gap-2 w-full justify-end">
              <span className="text-4xl text-end">
                {enrollment?.points}
              </span>
              <img src="/images/coin.png" className="h-[65px]" />
            </div>
          </div>
          {/* Recent Kudos */}
          <div className="p-4 w-[800px] flex-1 bg-background neo-container flex flex-col overflow-y-auto m-auto">
            <h2 className="text-2xl w-full mb-4">
              Recent Kudos Recieved
            </h2>
            <div className="flex gap-2 w-full">
              {kudos && (
                <Table>
                  <TableCaption className="text-foreground">
                    That's all!
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[500px]">Kudo Type</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Date Recieved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...kudos]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((kudo) => (
                        <TableRow key={kudo.id}>
                          <TableCell className="font-base">{kudo.name}</TableCell>
                          <TableCell className="text-right">{kudo.value}</TableCell>
                          <TableCell className="text-right">{kudo.createdAt.toDateString()}</TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>

              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
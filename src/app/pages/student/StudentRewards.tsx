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
import { RequestRewardButtons } from "@/app/components/student/RequestRewardButtons";

export async function StudentRewards({ ctx, params, request }: RequestInfo) {

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

  const rewards = await db.reward.findMany({
    where: { groupId: groupId },
    orderBy: { cost: "asc" }
  })

  const redeemed = await db.redeemed.findMany({
    where: {
      userId: ctx.user.id,
      groupId: groupId,
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="flex flex-col h-screen min-w-screen">

      <StudentNav url={request.url} currentGroup={groupId} />

      <div className="flex-1 overflow-auto bg-green-background relative p-4">
        <div className="w-full min-h-full gap-4 flex flex-col">
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
          {/* Buttons to redeem awards */}
          <div className="p-4 w-[800px] bg-background neo-container flex flex-col overflow-y-auto m-auto">
            <h2 className="text-2xl w-full mb-4">
              Request a Reward with Your Kudos
            </h2>
            <div className="flex gap-4 w-full flex-wrap overflow-y-auto">
              {enrollment && <RequestRewardButtons rewards={rewards} enrollment={enrollment} />}
            </div>
          </div>
          {/* Recent Redeemed */}
          <div className="p-4 w-[800px] min-h-[400px] flex-1 bg-background neo-container flex flex-col overflow-y-auto m-auto">
            <h2 className="text-2xl w-full mb-4">
              Recent rewards Requested
            </h2>
            <div className="flex gap-2 w-full">
              {redeemed && (
                <Table>
                  <TableCaption className="text-foreground">
                    That's all!
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[500px]">Kudo Type</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Date Recieved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redeemed.map((redeemed) => (
                      <TableRow key={redeemed.id} className={redeemed.reviewed === true ? "bg-green-300" : "bg-background"}>
                        <TableCell className="font-base">{redeemed.name}</TableCell>
                        <TableCell className="text-right">{redeemed.cost}</TableCell>
                        <TableCell className="text-right">{redeemed.reviewed === true ? "Approved" : "Pending Approval"}</TableCell>
                        <TableCell className="text-right">{redeemed.createdAt.toDateString()}</TableCell>
                      </TableRow>
                    ))}
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
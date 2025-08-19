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
  TableCaption,
} from "@/app/components/ui/table"

import { ApproveRedeemedButton } from "@/app/components/teacher/ApproveRedeemedButton";
import { CancelRedeemedButton } from "@/app/components/teacher/CancelRedeemedButton";
import { GroupHeader } from "@/app/components/teacher/GroupHeader";

export async function Rewards({ params, request }: RequestInfo) {
  const groupId = params.groupId

  const redeemed = await db.redeemed.findMany({
    where: { groupId: groupId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  const group = await db.group.findUnique({
    where: { id: groupId }
  })

  const pending = redeemed.filter(r => r.reviewed === false)
  const reviewed = redeemed.filter(r => r.reviewed === true)

  return (
    <div className="min-h-screen min-w-screen grid grid-cols-1 grid-rows-8">
      <TeacherNav url={request.url} currentGroup={groupId} />
      <div className="flex flex-col gap-4 bg-green-background min-w-screen row-span-7 p-8">
        {group && <GroupHeader group={group} />}
        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Pending Rewards</h2>
          <Table>
            <TableCaption className="text-foreground">
              Pending rewards are rewards that your students have reddemed with their kudos. Track whether or not they have actually recieved them by approving them here.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Date Recieved</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((p) => (
                <TableRow key={p.id} className={p.reviewed === true ? "bg-green-300" : "bg-background"}>
                  <TableCell className="font-base">{p.name}</TableCell>
                  <TableCell className="font-base">{p.user.firstName} {p.user.lastName}</TableCell>
                  <TableCell className="text-right">{p.cost}</TableCell>
                  <TableCell className="text-right">{p.createdAt.toDateString()}</TableCell>
                  <TableCell className="text-right">
                    <ApproveRedeemedButton redeemed={p} />
                    <CancelRedeemedButton redeemed={p} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Reviewed Rewards</h2>
          <Table>
            {reviewed.length === 0 && (
              <TableCaption className="text-foreground">
                Rewards that are approved will be found here.
              </TableCaption>
            )}
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Date Recieved</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.length > 0 && reviewed.map((r) => (
                <TableRow key={r.id} className="bg-background">
                  <TableCell className="font-base">{r.name}</TableCell>
                  <TableCell className="font-base">{r.user.firstName} {r.user.lastName}</TableCell>
                  <TableCell className="text-right">{r.cost}</TableCell>
                  <TableCell className="text-right">{r.createdAt.toDateString()}</TableCell>
                  <TableCell className="text-right"><CancelRedeemedButton redeemed={r} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
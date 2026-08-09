import { ErrorResponse, type RequestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { assertTeacherOwnsGroup } from "@/auth";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { ApproveRedeemedButton } from "@/app/components/teacher/ApproveRedeemedButton";
import { CancelRedeemedButton } from "@/app/components/teacher/CancelRedeemedButton";
import { GroupHeader } from "@/app/components/teacher/GroupHeader";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";
import { RedemptionDate } from "@/app/components/teacher/RedemptionDate";
import { loadRedemptions } from "@/app/components/teacher/queries";

/** The teacher's approval queue for rewards students have spent kudos on. */
export async function Rewards({ params, request }: RequestInfo) {
  const groupId = params.groupId;
  await assertTeacherOwnsGroup(groupId);

  const group = await db
    .selectFrom("groups")
    .select(["id", "name", "rewardedPoints", "codeMode"])
    .where("id", "=", groupId)
    .executeTakeFirst();

  if (!group) {
    throw new ErrorResponse(404, "Group Not Found");
  }

  const [redemptions, sharedCode] = await Promise.all([
    loadRedemptions(groupId),
    db
      .selectFrom("classCodes")
      .select("code")
      .where("groupId", "=", groupId)
      .where("kind", "=", "group")
      .executeTakeFirst(),
  ]);

  const pending = redemptions.filter((row) => !row.reviewed);
  const reviewed = redemptions.filter((row) => row.reviewed);

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <div className="h-[100px] flex-shrink-0">
        <TeacherNav
          url={request.url}
          currentGroup={groupId}
          redeemedCount={pending.length}
        />
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-4 bg-green-background min-w-screen p-8">
        <GroupHeader
          group={group}
          codeMode={group.codeMode}
          classCode={sharedCode?.code ?? null}
        />

        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Pending Rewards</h2>
          <Table>
            <TableCaption className="text-foreground">
              Rewards your students have redeemed with their kudos. Approve one
              once they have actually received it.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((redemption) => (
                <TableRow key={redemption.id} className="bg-background">
                  <TableCell className="font-base">{redemption.name}</TableCell>
                  <TableCell className="font-base">
                    {redemption.firstName} {redemption.lastName}
                  </TableCell>
                  <TableCell className="font-base">
                    {redemption.response ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{redemption.cost}</TableCell>
                  <TableCell className="text-right">
                    <RedemptionDate value={redemption.createdAt} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <ApproveRedeemedButton redeemedId={redemption.id} />
                    <CancelRedeemedButton
                      redeemedId={redemption.id}
                      cost={redemption.cost}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-background w-full neo-container p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Reviewed Rewards</h2>
          <Table>
            {reviewed.length === 0 ? (
              <TableCaption className="text-foreground">
                Rewards you have approved will be found here.
              </TableCaption>
            ) : null}
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((redemption) => (
                <TableRow key={redemption.id} className="bg-green-300">
                  <TableCell className="font-base">{redemption.name}</TableCell>
                  <TableCell className="font-base">
                    {redemption.firstName} {redemption.lastName}
                  </TableCell>
                  <TableCell className="font-base">
                    {redemption.response ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{redemption.cost}</TableCell>
                  <TableCell className="text-right">
                    <RedemptionDate
                      value={redemption.reviewedAt ?? redemption.createdAt}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CancelRedeemedButton
                      redeemedId={redemption.id}
                      cost={redemption.cost}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

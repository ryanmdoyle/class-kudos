import type { RequestInfo } from "rwsdk/worker";

import { assertStudentEnrolled } from "@/auth";
import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { PointsHeader } from "@/app/components/student/PointsHeader";
import { RequestRewardButtons } from "@/app/components/student/RequestRewardButtons";
import { StudentNav } from "@/app/components/student/StudentNav";
import { formatShortDate } from "@/app/components/student/format";

import {
  loadGroupRewards,
  loadStudentEnrollment,
  loadStudentRedemptions,
} from "./data";

/**
 * `/student/:groupId/rewards` — spend kudos, and see what I've asked for.
 *
 * Same authorization shape as the group page: `assertStudentEnrolled` first,
 * then every read scoped to `user.id`. The reward CATALOGUE is group-scoped
 * rather than user-scoped, which is correct — it is the same list for the whole
 * class — but the balance and the redemption history are not.
 */
export async function StudentRewards({ params, request }: RequestInfo) {
  const groupId = String(params.groupId ?? "");
  const user = await assertStudentEnrolled(groupId);

  const enrollment = await loadStudentEnrollment(user.id, groupId);

  if (!enrollment) {
    return (
      <div className="bg-green-background flex min-h-screen w-full flex-col">
        <StudentNav url={request.url} firstName={user.firstName} />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="neo-container bg-background max-w-md p-8 text-center">
            <h1 className="text-2xl font-bold">This class isn&apos;t open</h1>
            <a href={link("/student")} className="mt-6 inline-block">
              <Button variant="green" className="h-14 px-6 text-lg font-bold">
                Back to My Classes
              </Button>
            </a>
          </div>
        </main>
      </div>
    );
  }

  const [rewards, redemptions] = await Promise.all([
    loadGroupRewards(groupId),
    loadStudentRedemptions(user.id, groupId),
  ]);

  return (
    <div className="bg-green-background flex min-h-screen w-full flex-col">
      <StudentNav
        url={request.url}
        firstName={user.firstName}
        currentGroupId={groupId}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
        <PointsHeader
          firstName={user.firstName}
          lastName={user.lastName}
          groupName={enrollment.groupName}
          points={enrollment.points}
        />

        <section className="neo-container bg-background p-6">
          <h2 className="mb-4 text-2xl font-bold">Spend My Kudos</h2>
          <RequestRewardButtons
            groupId={groupId}
            rewards={rewards}
            points={enrollment.points}
          />
        </section>

        <section className="neo-container bg-background flex flex-1 flex-col p-6">
          <h2 className="mb-4 text-2xl font-bold">What I&apos;ve Asked For</h2>

          {redemptions.length === 0 ? (
            <p className="text-base opacity-70">
              You haven&apos;t asked for a reward yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Reward</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((redemption) => (
                  <TableRow
                    key={redemption.id}
                    className={redemption.reviewed ? "bg-chart-2" : undefined}
                  >
                    <TableCell className="text-base font-base">
                      {redemption.name}
                    </TableCell>
                    <TableCell className="text-right text-base">
                      {redemption.cost}
                    </TableCell>
                    <TableCell className="text-right text-base font-bold">
                      {redemption.reviewed ? "Approved" : "Waiting"}
                    </TableCell>
                    <TableCell className="text-right text-base">
                      {formatShortDate(redemption.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <a href={link("/student/:groupId", { groupId })}>
          <Button variant="default" className="h-16 w-full text-xl font-bold">
            Back to my kudos
          </Button>
        </a>
      </main>
    </div>
  );
}

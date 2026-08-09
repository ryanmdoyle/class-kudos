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
import { loadGroupLocations } from "@/app/components/public/board";
import { MyLocationPicker } from "@/app/components/student/MyLocationPicker";
import { PointsHeader } from "@/app/components/student/PointsHeader";
import { StudentNav } from "@/app/components/student/StudentNav";
import { formatShortDate } from "@/app/components/student/format";

import { loadStudentEnrollment, loadStudentKudos } from "./data";

/**
 * `/student/:groupId` — my points, where I am, and my kudos history.
 *
 * `assertStudentEnrolled(groupId)` is the whole authorization story: it 404s
 * (not 403s, so group ids stay un-enumerable) unless the SIGNED-IN student has
 * an enrollment row in this group. Every read below is then keyed on
 * `user.id` + `groupId` — see the invariant comment in `./data`. There is no
 * code path on this page that can be pointed at another child.
 */
export async function StudentGroup({ params, request }: RequestInfo) {
  const groupId = String(params.groupId ?? "");
  const user = await assertStudentEnrolled(groupId);

  const enrollment = await loadStudentEnrollment(user.id, groupId);

  if (!enrollment) {
    return (
      <ClassUnavailable url={request.url} firstName={user.firstName} />
    );
  }

  const [kudos, locations] = await Promise.all([
    loadStudentKudos(user.id, groupId),
    loadGroupLocations(groupId),
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
          <h2 className="mb-4 text-2xl font-bold">Where are you?</h2>
          <MyLocationPicker
            groupId={groupId}
            locations={locations}
            locationId={enrollment.locationId}
            locationName={enrollment.locationName}
            locationColor={enrollment.locationColor}
          />
        </section>

        <section className="neo-container bg-background flex flex-1 flex-col p-6">
          <h2 className="mb-4 text-2xl font-bold">Kudos I&apos;ve Earned</h2>

          {kudos.length === 0 ? (
            <p className="text-base opacity-70">
              No kudos yet — you&apos;ll see them here as soon as your teacher
              gives you some.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">What for</TableHead>
                  <TableHead className="text-right">Kudos</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kudos.map((kudo) => (
                  <TableRow key={kudo.id}>
                    <TableCell className="text-base font-base">
                      {kudo.name}
                    </TableCell>
                    <TableCell className="text-right text-base font-bold">
                      {kudo.value > 0 ? `+${kudo.value}` : kudo.value}
                    </TableCell>
                    <TableCell className="text-right text-base">
                      {formatShortDate(kudo.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <a href={link("/student/:groupId/rewards", { groupId })}>
          <Button
            variant="gold"
            className="h-16 w-full text-xl font-bold"
          >
            Spend my kudos on a reward
          </Button>
        </a>
      </main>
    </div>
  );
}

/**
 * Reachable when a group is archived between `assertStudentEnrolled` and the
 * enrollment read. Rare, but it must not be a blank page or a stack trace.
 */
function ClassUnavailable({
  url,
  firstName,
}: {
  url: string;
  firstName: string;
}) {
  return (
    <div className="bg-green-background flex min-h-screen w-full flex-col">
      <StudentNav url={url} firstName={firstName} />
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="neo-container bg-background max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold">This class isn&apos;t open</h1>
          <p className="mt-2 text-base">
            Your teacher may have closed it. Try one of your other classes.
          </p>
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

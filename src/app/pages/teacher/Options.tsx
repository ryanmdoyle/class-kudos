import { ErrorResponse, type RequestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { assertTeacherOwnsGroup, getGroupCodes } from "@/auth";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { AddKudoTypeButton } from "@/app/components/teacher/AddKudoTypeButton";
import { AddLocationButton } from "@/app/components/teacher/AddLocationButton";
import { AddNewStudentsButton } from "@/app/components/teacher/AddNewStudentsButton";
import { AddRewardButton } from "@/app/components/teacher/AddRewardButton";
import { EditEnrolledButton } from "@/app/components/teacher/EditEnrolledButton";
import { EditKudoTypeButton } from "@/app/components/teacher/EditKudoTypeButton";
import { EditLocationButton } from "@/app/components/teacher/EditLocationButton";
import { EditRewardButton } from "@/app/components/teacher/EditRewardButton";
import { GroupHeader } from "@/app/components/teacher/GroupHeader";
import { GroupWarningArea } from "@/app/components/teacher/GroupWarningArea";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";
import { ClassCodesPanel } from "@/app/components/teacher/options/ClassCodesPanel";
import {
  countPendingRedemptions,
  loadEnrollmentsWithUser,
} from "@/app/components/teacher/queries";
import { link } from "@/app/shared/links";

/** Everything about a group that is not "give out kudos": setup and admin. */
export async function Options({ params, request }: RequestInfo) {
  const groupId = params.groupId;
  await assertTeacherOwnsGroup(groupId);

  const group = await db
    .selectFrom("groups")
    .select(["id", "name", "rewardedPoints", "publicId", "codeMode"])
    .where("id", "=", groupId)
    .executeTakeFirst();

  if (!group) {
    throw new ErrorResponse(404, "Group Not Found");
  }

  const [kudoTypes, rewards, enrollments, locations, codes, pendingCount] =
    await Promise.all([
      db
        .selectFrom("kudosTypes")
        .selectAll()
        .where("groupId", "=", groupId)
        .orderBy("value", "asc")
        .execute(),
      db
        .selectFrom("rewards")
        .selectAll()
        .where("groupId", "=", groupId)
        .orderBy("cost", "asc")
        .execute(),
      loadEnrollmentsWithUser(groupId),
      db
        .selectFrom("locations")
        .selectAll()
        .where("groupId", "=", groupId)
        // Retired locations are kept so old travel-log rows still resolve to a
        // name, but they are not offered here.
        .where("isActive", "=", true)
        .orderBy("name", "asc")
        .execute(),
      getGroupCodes(groupId),
      countPendingRedemptions(groupId),
    ]);

  const publicTravelLogPath = link("/travel-log/:groupPublicId", {
    groupPublicId: group.publicId,
  });

  return (
    <div className="h-screen min-w-screen flex flex-col">
      <TeacherNav
        url={request.url}
        currentGroup={groupId}
        redeemedCount={pendingCount}
      />

      <div className="flex flex-col flex-1 gap-4 bg-green-background min-w-screen overflow-auto p-8">
        <GroupHeader
          group={group}
          codeMode={group.codeMode}
          classCode={codes.groupCode}
        />

        {/* The single most important panel on this page: without a working code
            no student can get in at all, so it sits above everything else. */}
        <ClassCodesPanel
          groupId={group.id}
          groupName={group.name}
          initial={codes}
        />

        <div className="flex gap-4">
          <div className="bg-background w-full neo-container p-6 mb-4 relative">
            <h2 className="text-2xl font-bold mb-6">Kudos</h2>
            <Table>
              <TableCaption className="text-foreground">
                “Kudos” are what you reward students with — simple titles like
                “Helping”, or longer ideas such as “Turning work in early”.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right w-[100px]">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kudoTypes.map((kudoType) => (
                  <TableRow key={kudoType.id} className="bg-purple-200">
                    <TableCell className="font-base">{kudoType.name}</TableCell>
                    <TableCell>{kudoType.value}</TableCell>
                    <TableCell className="text-right p-0">
                      <EditKudoTypeButton kudoType={kudoType} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AddKudoTypeButton groupId={groupId} />
          </div>

          <div className="bg-background w-full neo-container p-6 mb-4 relative">
            <h2 className="text-2xl font-bold mb-6">Rewards</h2>
            <Table>
              <TableCaption className="text-foreground">
                “Rewards” are what your students spend their kudos on.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Asks a question</TableHead>
                  <TableHead className="text-right w-[100px]">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id} className="bg-purple-200">
                    <TableCell className="font-base">{reward.name}</TableCell>
                    <TableCell>{reward.cost}</TableCell>
                    <TableCell>
                      {reward.responseRequired ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-right p-0">
                      <EditRewardButton reward={reward} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AddRewardButton groupId={groupId} />
          </div>
        </div>

        <div className="bg-background w-full neo-container p-6 relative">
          <h2 className="text-2xl font-bold mb-6">Enrolled Students</h2>
          {enrollments.length === 0 ? (
            <p>
              No students yet. Paste your class list to get started — students do
              not need to create accounts, and they have no username or password.
            </p>
          ) : (
            <Table>
              <TableCaption className="text-foreground">
                Your class list. Students log in with the class code above.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right pr-6">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id} className="bg-purple-200">
                    <TableCell className="font-base">
                      {enrollment.user.firstName}
                    </TableCell>
                    <TableCell>{enrollment.user.lastName}</TableCell>
                    <TableCell className="text-right">
                      {enrollment.points}
                    </TableCell>
                    <TableCell className="text-right p-0 pr-2">
                      <EditEnrolledButton enrollment={enrollment} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <AddNewStudentsButton groupId={group.id} />
        </div>

        <div className="bg-background w-full neo-container p-6 relative">
          <h2 className="text-2xl font-bold mb-6">Locations</h2>
          <Table>
            <TableCaption className="text-foreground">
              Places students can sign out to. The public board for this class is
              at{" "}
              <a
                href={publicTravelLogPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                /travel-log/{group.publicId}
              </a>
              {" — it needs no login, so it is safe to leave on a display."}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right pr-6">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id} className="bg-purple-200">
                  <TableCell className="font-base">{location.name}</TableCell>
                  <TableCell className="font-base">
                    {location.description ?? ""}
                  </TableCell>
                  <TableCell>
                    <div
                      className="border border-border"
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: location.color || "#808080",
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right p-0 pr-2">
                    <EditLocationButton location={location} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AddLocationButton groupId={groupId} />
        </div>

        <GroupWarningArea group={group} />
      </div>
    </div>
  );
}

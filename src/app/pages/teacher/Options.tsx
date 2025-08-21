import { AddKudoTypeButton } from "@/app/components/teacher/AddKudoTypeButton";
import { AddNewStudentsButton } from "@/app/components/teacher/AddNewStudentsButton";
import { EditKudoTypeButton } from "@/app/components/teacher/EditKudoTypeButton";
import { AddRewardButton } from "@/app/components/teacher/AddRewardButton";
import { EditRewardButton } from "@/app/components/teacher/EditRewardButton";
import { EditEnrolledButton } from "@/app/components/teacher/EditEnrolledButton";
import { EditLocationButton } from "@/app/components/teacher/EditLocationButton";
import { AddLocationButton } from "@/app/components/teacher/AddLocationButton";
import { TeacherNav } from "@/app/components/teacher/TeacherNav"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"
import { db } from "@/db";
import { RequestInfo } from "rwsdk/worker";
import { GroupHeader } from "@/app/components/teacher/GroupHeader";
import { GroupWarningArea } from "@/app/components/teacher/GroupWarningArea";
import { StudentAccessCodeCell } from "@/app/components/teacher/StudentAccessCodeCell";
import { EnrollmentWithUser } from "@/app/lib/types";
import { GenerateClassAccessButton } from "@/app/components/teacher/options/GenerateClassAccessButton";
import { CopyUsernamesButton } from "@/app/components/teacher/options/CopyUsernamesButton";

export async function Options({ params, request }: RequestInfo) {
  const groupId = params.groupId;

  // Query KudoTypes, Rewards, and Enrollments (with users)
  const kudoTypes = await db.kudosType.findMany({
    where: { groupId },
    orderBy: { value: "asc" }
  });

  const rewards = await db.reward.findMany({
    where: { groupId },
    orderBy: { cost: "asc" }
  });

  const enrollments = await db.enrollment.findMany({
    where: { groupId },
    include: { user: true },
    orderBy: [{ user: { firstName: "asc" } }]
  });

  const group = await db.group.findUnique({
    where: { id: groupId },
  });

  const locations = await db.location.findMany({
    where: {
      groupId: groupId,
      isActive: true,
    }
  })

  function getUserIdsFromEnrollments(enrollments: EnrollmentWithUser[]): string[] {
    return enrollments.map(enrollment => enrollment.userId);
  }

  function getUsernamesFromEnrollments(enrollments: EnrollmentWithUser[]): string[] {
    return enrollments.map(enrollment => enrollment.user.username);
  }

  const userIds = getUserIdsFromEnrollments(enrollments)

  return (
    <div className="h-screen min-w-screen flex flex-col">
      <TeacherNav url={request.url} currentGroup={groupId} />
      <div className="flex flex-col flex-1 gap-4 bg-green-background min-w-screen overflow-auto p-8">
        {group && <GroupHeader group={group} />}
        <div className="flex gap-4">
          <div className="bg-background w-full neo-container p-6 mb-4 relative">
            <h2 className="text-2xl font-bold mb-6">Kudos</h2>
            <Table>
              <TableCaption className="text-foreground">
                "Kudos" are what you reward students with. They can be simple titles like "Helping," or longer ideas, such as "Turning work in early."
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right w-[100px]">Edit Kudo Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kudoTypes.map((kudo) => (
                  <TableRow key={kudo.id} className="bg-purple-200">
                    <TableCell className="font-base">{kudo.name}</TableCell>
                    <TableCell>{kudo.value}</TableCell>
                    <TableCell className="text-right p-0">
                      <EditKudoTypeButton kudoType={kudo} />
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
                "Rewards" are what your students will be able to redeem with their kudos.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right w-[100px]">Edit Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id} className="bg-purple-200">
                    <TableCell className="font-base">{reward.name}</TableCell>
                    <TableCell>{reward.cost}</TableCell>
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
            <p>No students enrolled yet. Add new students to get started! {group?.enrollId ? (
              <> If a student has an account already, they can use the code <strong className="text-lg font-code">{group.enrollId}</strong> to enroll in this group.</>
            ) : null}</p>
          ) : (

            <Table>
              <TableCaption className="text-foreground">
                A list of your enrolled students.
                {group?.enrollId ? (
                  <> If a student has an account already, they can use the code <strong className="text-lg font-code">{group.enrollId}</strong> to enroll in this group.</>
                ) : null}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead className="text-right">
                    <div className="flex justify-start items-center gap-4 h-full">
                      <span>Username</span>
                      <CopyUsernamesButton usernames={getUsernamesFromEnrollments(enrollments)} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex justify-end items-center gap-4 h-full">
                      <GenerateClassAccessButton userIds={userIds} />
                      <span>Access Code</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right pr-6">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id} className="bg-purple-200">
                    <TableCell className="font-base">{enrollment.user.firstName}</TableCell>
                    <TableCell>{enrollment.user.lastName}</TableCell>
                    <TableCell>{enrollment.user.username}</TableCell>
                    <TableCell className="text-right p-0">
                      <StudentAccessCodeCell userId={enrollment.user.id} />
                    </TableCell>
                    <TableCell className="text-right p-0 pr-2">
                      <EditEnrolledButton enrollment={enrollment} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          )}
          {group && <AddNewStudentsButton groupId={group.id} />}
        </div>

        <div className="bg-background w-full neo-container p-6 relative">
          <h2 className="text-2xl font-bold mb-6">Locations</h2>
          {enrollments.length === 0 ? (
            <p>No students enrolled yet. Add new students to get started! {group?.enrollId ? (
              <> If a student has an account already, they can use the code <strong className="text-lg font-code">{group.enrollId}</strong> to enroll in this group.</>
            ) : null}</p>
          ) : (

            <Table>
              <TableCaption className="text-foreground">
                Locations you'd like to track. Add spaces outside your classroom, and student can select them as options when leaving your room.
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
                    <TableCell className="font-base">{location.description}</TableCell>
                    <TableCell>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: location.color || "#808080",
                          border: '1px solid #ccc'
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
          )}
          <AddLocationButton groupId={groupId} />
        </div>

        {group && (
          <GroupWarningArea group={group} />
        )}
      </div>
    </div>
  )
}
import { AddEnrollmentButton } from "@/app/components/student/AddEnrollmentButton";
import { StudentNav } from "@/app/components/student/StudentNav";
import { requestInfo } from "rwsdk/worker"
import { db, Enrollment, Group } from "@/db";
import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";

export type EnrollmentWithGroup = Enrollment & { group: Group };

export async function Student() {
  const { request, ctx } = requestInfo;

  const enrollments = await db.enrollment.findMany({
    where: {
      userId: ctx.user?.id,
      group: { archived: false }
    },
    include: { group: true },
    orderBy: {
      group: {
        name: 'asc',
      },
    },
  })

  return (
    <div className="flex flex-col gap-0 min-h-screen min-w-screen">
      <StudentNav url={request.url} />

      <div className="bg-green-background flex-1 overflow-auto border border-border flex items-center justify-center">
        <div className="bg-background max-w-[500px] w-full mx-auto p-12 neo-container relative">
          <h1 className="text-3xl text-center">Groups</h1>
          <p className="test center py-6">Select a group to get started!</p>
          <ul className="pb-6">
            {enrollments && (
              enrollments.map((enrollment: EnrollmentWithGroup) => (
                <a href={link("/student/:groupId", { groupId: enrollment.group.id })} key={enrollment.id}>
                  <Button variant="gold" className="text-xl font-bold mb-2">{enrollment.group.name}</Button>
                </a>
              ))
            )}
          </ul>
          <AddEnrollmentButton />
        </div>
      </div>
    </div>
  )
}
import { ErrorResponse, type RequestInfo } from "rwsdk/worker";

import { db, parseCodeMode } from "@/db";
import { assertTeacherOwnsGroup } from "@/auth";
import { GroupDashboard } from "@/app/components/teacher/GroupDashboard";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";
import {
  countPendingRedemptions,
  loadEnrollmentsWithUser,
  loadKudosWithUser,
} from "@/app/components/teacher/queries";

/**
 * The live classroom screen: pick students, hand out kudos.
 *
 * `assertTeacherOwnsGroup` runs FIRST and filters on `ownerId` inside its own
 * query, so nothing below can read another teacher's group even though the id
 * comes straight off the URL. It throws 404 (not 403) so group ids stay
 * unenumerable.
 *
 * Prisma's single `include:`-heavy `findUnique` is now four explicit queries.
 * That is not a regression — `include:` was issuing separate statements anyway;
 * this just makes them visible and lets each one select only what it needs.
 */
export async function Group({ params, request }: RequestInfo) {
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

  const [kudoTypes, enrollments, kudos, redeemedAwaitingReview, sharedCode] =
    await Promise.all([
      db
        .selectFrom("kudosTypes")
        .selectAll()
        .where("groupId", "=", groupId)
        .orderBy("value", "asc")
        .orderBy("name", "asc")
        .execute(),
      loadEnrollmentsWithUser(groupId),
      loadKudosWithUser(groupId),
      countPendingRedemptions(groupId),
      db
        .selectFrom("classCodes")
        .select("code")
        .where("groupId", "=", groupId)
        .where("kind", "=", "group")
        .executeTakeFirst(),
    ]);

  return (
    <div className="flex flex-col h-screen min-w-screen">
      <TeacherNav
        url={request.url}
        currentGroup={groupId}
        redeemedCount={redeemedAwaitingReview}
      />

      <div className="flex-1 overflow-auto">
        <GroupDashboard
          group={{
            id: group.id,
            name: group.name,
            rewardedPoints: group.rewardedPoints,
            // Parse, don't cast: this value drives which branch of the header
            // and the empty-state instructions render.
            codeMode: parseCodeMode(group.codeMode),
            classCode: sharedCode?.code ?? null,
          }}
          initialEnrollments={enrollments}
          groupKudoTypes={kudoTypes}
          initialKudos={kudos}
        />
      </div>
    </div>
  );
}

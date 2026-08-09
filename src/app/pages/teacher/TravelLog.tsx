import { ErrorResponse, type RequestInfo } from "rwsdk/worker";

import { db } from "@/db";
import { assertTeacherOwnsGroup } from "@/auth";
import { TeacherNav } from "@/app/components/teacher/TeacherNav";
import { TravelLogTable } from "@/app/components/teacher/TravelLogTable";
import {
  countPendingRedemptions,
  loadTravelLog,
} from "@/app/components/teacher/queries";
import { link } from "@/app/shared/links";

/** Where students have signed out to, most recent first. */
export async function TravelLog({ params, request }: RequestInfo) {
  const groupId = params.groupId;
  await assertTeacherOwnsGroup(groupId);

  const group = await db
    .selectFrom("groups")
    .select(["id", "name", "publicId"])
    .where("id", "=", groupId)
    .executeTakeFirst();

  if (!group) {
    throw new ErrorResponse(404, "Group Not Found");
  }

  const [trips, redeemedAwaitingReview] = await Promise.all([
    loadTravelLog(groupId),
    countPendingRedemptions(groupId),
  ]);

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <div className="h-[100px] flex-shrink-0">
        <TeacherNav
          url={request.url}
          currentGroup={groupId}
          redeemedCount={redeemedAwaitingReview}
        />
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-4 bg-green-background min-w-screen p-8">
        <div className="bg-background w-full neo-container p-6 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
            <h2 className="text-2xl font-bold">Travel Log — {group.name}</h2>
            <a
              className="text-purple-600 underline"
              href={link("/travel-log/:groupPublicId", {
                groupPublicId: group.publicId,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the public board
            </a>
          </div>
          {/* Showing at most the 500 most recent entries — see loadTravelLog. */}
          <TravelLogTable trips={trips} />
        </div>
      </div>
    </div>
  );
}

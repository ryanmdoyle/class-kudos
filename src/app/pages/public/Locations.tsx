import type { RequestInfo } from "rwsdk/worker";

import { loadTravelBoard } from "@/app/components/public/board";
import { StudentTravelLog } from "@/app/components/public/StudentTravelLog";

/**
 * `/travel-log/:groupPublicId` — the PUBLIC classroom display board.
 *
 * Mounted OUTSIDE every auth middleware (see `src/worker.tsx`), so this file
 * must never touch `ctx.user`, `ctx.session`, or any `require*()` guard. It has
 * to work on a projector that nobody has ever logged in to.
 *
 * The capability is the group's `publicId` and nothing else, so the page is
 * looked up by `groups.publicId` — never by `groups.id` — and an unknown or
 * archived id renders the same neutral "not available" panel as a made-up one.
 * What crosses to the browser is only `BoardStudent` / `BoardLocation`: first
 * name, last initial, and where they are. No user ids, no point balances, no
 * group id. See `@/app/components/public/types`.
 */
export async function Locations({ params }: RequestInfo) {
  const publicId = String(params.groupPublicId ?? "");
  const board = await loadTravelBoard(publicId);

  if (!board) {
    return (
      <BoardShell title="Student Travel Log">
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="neo-container bg-background max-w-md p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">
              This travel log isn&apos;t available
            </h2>
            <p className="text-base">
              Check the link with your teacher — it may have changed, or this
              class may have been archived.
            </p>
          </div>
        </div>
      </BoardShell>
    );
  }

  return (
    <BoardShell title={board.groupName}>
      <StudentTravelLog
        students={board.students}
        locations={board.locations}
        groupPublicId={board.groupPublicId}
      />
    </BoardShell>
  );
}

function BoardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="bg-background flex items-center gap-3 border-b-2 border-border px-4 py-4">
        <img src="/images/coin.png" alt="" className="h-12 w-12" />
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">
            {title}
          </h1>
          <p className="text-sm opacity-70">Student Travel Log</p>
        </div>
      </header>

      <div className="bg-green-background flex flex-1 flex-col">{children}</div>
    </div>
  );
}

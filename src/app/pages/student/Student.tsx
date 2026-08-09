import type { RequestInfo } from "rwsdk/worker";

import { requireStudent } from "@/auth";
import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";
import { StudentNav } from "@/app/components/student/StudentNav";
import { pluralKudos } from "@/app/components/student/format";

import { loadStudentGroups } from "./data";

/**
 * `/student` — "my classes".
 *
 * `requireStudent()` is belt-and-braces: `src/worker.tsx` already redirects
 * anonymous visitors and 403s teachers before this route runs. Calling it here
 * costs one property read and gives us a non-null, correctly-typed user without
 * an `if (!ctx.user) throw` dance.
 *
 * Self-enrolment is GONE in v2 — `groups.enrollId` no longer exists and the
 * legacy `AddEnrollmentButton` has been deleted. A child joins a class by
 * typing its class code at login, so the only thing missing from this list is
 * fixed by talking to the teacher, which is what the empty state says.
 */
export async function Student({ request }: RequestInfo) {
  const user = requireStudent();
  const groups = await loadStudentGroups(user.id);

  return (
    <div className="bg-green-background flex min-h-screen w-full flex-col">
      <StudentNav url={request.url} firstName={user.firstName} />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="neo-container bg-background w-full max-w-xl p-8">
          <h1 className="text-center text-3xl font-bold">My Classes</h1>

          {groups.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-lg">You&apos;re not in a class yet.</p>
              <p className="mt-2 text-base opacity-70">
                Ask your teacher for your class code, then log in with it.
              </p>
              <a href={link("/user/logout")} className="mt-6 inline-block">
                <Button variant="neutral" className="h-14 px-6 text-lg font-bold">
                  Log out
                </Button>
              </a>
            </div>
          ) : (
            <>
              <p className="mt-2 text-center text-lg">
                Pick a class to get started!
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {groups.map((group) => (
                  <li key={group.groupId}>
                    <a
                      href={link("/student/:groupId", {
                        groupId: group.groupId,
                      })}
                      className="block"
                    >
                      <Button
                        variant="gold"
                        className="h-auto min-h-[76px] w-full flex-col gap-1 whitespace-normal px-4 py-3 text-2xl font-bold"
                      >
                        <span>{group.groupName}</span>
                        <span className="text-base font-bold">
                          {pluralKudos(group.points)}
                        </span>
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

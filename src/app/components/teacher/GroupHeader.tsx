import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { formatCodeForDisplay } from "@/app/lib/codes";
import { link } from "@/app/shared/links";
import type { CodeMode } from "@/db";

export type GroupHeaderGroup = {
  id: string;
  name: string;
  rewardedPoints: number;
};

/**
 * The bar at the top of every group page.
 *
 * `group.enrollId` is GONE — student self-enrolment does not exist in v2. What
 * replaces it is the class code, which is why it is surfaced here: a teacher
 * needs to be able to put it on the board without navigating away. In
 * "individual" mode there is no single code to show, so this links to Options
 * instead of displaying one.
 */
export function GroupHeader({
  group,
  codeMode = "shared",
  classCode = null,
}: {
  group: GroupHeaderGroup;
  codeMode?: CodeMode;
  classCode?: string | null;
}) {
  const optionsHref = link("/teacher/:groupId/options", { groupId: group.id });

  return (
    <div className="p-4 w-full h-[100px] bg-background neo-container flex justify-between items-center">
      <div className="flex flex-col min-w-1/2">
        <h1 className="text-3xl w-full">{group.name}</h1>

        {codeMode === "shared" && classCode ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <i className="text-gray-500 hover:text-purple-600 hover:underline cursor-pointer">
                {"Class code: "}
                <span className="font-code">
                  {formatCodeForDisplay(classCode)}
                </span>
              </i>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-5xl font-code tracking-widest text-center py-6">
                  {formatCodeForDisplay(classCode)}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Students go to the login page, type this code, then pick their
                  name from the class list. Change or regenerate it under{" "}
                  <a className="underline" href={optionsHref}>
                    Options
                  </a>
                  .
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <a
            className="text-gray-500 hover:text-purple-600 hover:underline"
            href={optionsHref}
          >
            <i>
              {codeMode === "individual"
                ? "Each student has their own code — manage them in Options"
                : "No class code yet — create one in Options"}
            </i>
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 w-full justify-end">
        <span className="text-4xl text-end font-display">
          {group.rewardedPoints}
        </span>
        <img src="/images/coin.png" alt="kudos awarded" className="h-[65px]" />
      </div>
    </div>
  );
}

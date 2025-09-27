import { link } from "@/app/shared/links";
import { Button } from "../ui/button";

type TeacherNavProps = {
  url: string;
  currentGroup?: string;
  redeemedCount?: number;
};

export function TeacherNav({ url, currentGroup, redeemedCount }: TeacherNavProps) {
  const fullUrl = new URL(url);

  // Compute paths for comparison
  const groupsPath = "/teacher";
  const kudosPath = link("/teacher/:groupId", { groupId: currentGroup ?? "" });
  const rewardsPath = link("/teacher/:groupId/rewards", { groupId: currentGroup ?? "" });
  const optionsPath = link("/teacher/:groupId/options", { groupId: currentGroup ?? "" });

  return (
    <div className="h-[100px] border border-border flex items-center justify-between w-full">
      <div className="flex items-center gap-2 pl-4 flex-1">
        <img src="/images/coin.png" alt="coin" className="w-[60px]" />
        <h1 className="page-title font-bold">Class Kudos</h1>
      </div>
      <nav className="flex gap-8 flex-1 justify-center pt-4">
        {fullUrl.pathname !== '/teacher' && (
          <>
            <a href={groupsPath}>
              <Button variant={fullUrl.pathname === groupsPath ? "green" : "default"}>Groups</Button>
            </a>
            <a href={kudosPath}>
              <Button variant={fullUrl.pathname === kudosPath ? "green" : "default"}>Kudos</Button>
            </a>
            <a href={rewardsPath} className="relative flex items-center">
              <Button variant={fullUrl.pathname === rewardsPath ? "green" : "default"}>Rewards</Button>
              {(redeemedCount === 0 || redeemedCount == undefined) ? null : (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold neo-container bg-chart-3"
                  style={{ position: "absolute", top: -8, right: -18 }}
                >
                  {redeemedCount}
                </span>
              )}
            </a>
            <a href={optionsPath}>
              <Button variant={fullUrl.pathname === optionsPath ? "green" : "default"}>Options</Button>
            </a>
          </>
        )}
      </nav>
      <div className="flex-1 flex justify-end pr-4 pt-4">
        <a href={link("/user/logout")}>
          <Button variant="neutral">Logout</Button>
        </a>
      </div>
    </div>
  )
}
import { link } from "@/app/shared/links";
import { Button } from "../ui/button";

type StudentNavProps = {
  url: string;
  currentGroup?: string;
};

export function StudentNav({ url, currentGroup }: StudentNavProps) {
  const fullUrl = new URL(url);

  // Compute paths for comparison
  const groupsPath = "/student";
  const kudosPath = link("/student/:groupId", { groupId: currentGroup ?? "" });
  const rewardsPath = link("/student/:groupId/rewards", { groupId: currentGroup ?? "" });

  return (
    <div className="h-[100px] border border-border flex items-center justify-between w-full">
      <div className="flex items-center gap-2 pl-4 flex-1">
        <img src="/images/coin.png" alt="coin" className="w-[60px]" />
        <h1 className="page-title font-bold">Class Kudos</h1>
      </div>
      <nav className="flex gap-8 flex-1 justify-center pt-4">
        {fullUrl.pathname !== '/student' && (
          <>
            <a href={groupsPath}>
              <Button variant={fullUrl.pathname === groupsPath ? "green" : "default"}>Groups</Button>
            </a>
            <a href={kudosPath}>
              <Button variant={fullUrl.pathname === kudosPath ? "green" : "default"}>Kudos</Button>
            </a>
            <a href={rewardsPath}>
              <Button variant={fullUrl.pathname === rewardsPath ? "green" : "default"}>Rewards</Button>
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
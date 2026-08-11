import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";

type TeacherNavProps = {
  url: string;
  currentGroup?: string;
  redeemedCount?: number;
};

export function TeacherNav({
  url,
  currentGroup,
  redeemedCount = 0,
}: TeacherNavProps) {
  const { pathname } = new URL(url);

  const groupsPath = link("/teacher");

  // The per-group tabs only exist once a group is selected. Rendering them with
  // an empty groupId would produce "/teacher//rewards", which routes nowhere.
  const groupTabs = currentGroup
    ? [
        { href: link("/teacher/:groupId", { groupId: currentGroup }), label: "Kudos" },
        {
          href: link("/teacher/:groupId/rewards", { groupId: currentGroup }),
          label: "Rewards",
          badge: redeemedCount,
        },
        {
          href: link("/teacher/:groupId/travel-log", { groupId: currentGroup }),
          label: "Travel Log",
        },
        {
          href: link("/teacher/:groupId/options", { groupId: currentGroup }),
          label: "Options",
        },
      ]
    : [];

  return (
    <div className="h-[100px] border border-border flex items-center justify-between w-full">
      <div className="flex items-center gap-2 pl-4 flex-1">
        <img src="/images/coin.png" alt="" className="w-[60px]" />
        <h1 className="page-title font-bold">Class Kudos</h1>
      </div>

      <nav className="flex gap-8 flex-1 justify-center pt-4">
        {groupTabs.length > 0 ? (
          <>
            <a href={groupsPath}>
              <Button variant={pathname === groupsPath ? "green" : "default"}>
                Groups
              </Button>
            </a>
            {groupTabs.map((tab) => (
              <a key={tab.href} href={tab.href} className="relative flex items-center">
                <Button variant={pathname === tab.href ? "green" : "default"}>
                  {tab.label}
                </Button>
                {tab.badge ? (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold neo-container bg-chart-3"
                    style={{ position: "absolute", top: -8, right: -18 }}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </a>
            ))}
          </>
        ) : null}
      </nav>

      <div className="flex-1 flex justify-end pr-4 pt-4">
        <a href={link("/user/logout")}>
          <Button variant="neutral">Logout</Button>
        </a>
      </div>
    </div>
  );
}

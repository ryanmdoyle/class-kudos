import { link } from "@/app/shared/links";
import { Button } from "@/app/components/ui/button";

/**
 * The student header. A server component — it renders `Button`, which is a
 * client component, but has no state of its own.
 *
 * "My Classes" is ALWAYS present, including on `/student` itself. The legacy
 * nav hid every link on the dashboard, which left a child who had tapped into
 * the wrong class with no visible way back except the browser's back button —
 * the exact dead end this surface cannot have.
 */
export function StudentNav({
  url,
  firstName,
  currentGroupId,
}: {
  url: string;
  firstName?: string;
  currentGroupId?: string;
}) {
  const pathname = safePathname(url);

  const groupsPath = link("/student");
  const kudosPath = currentGroupId
    ? link("/student/:groupId", { groupId: currentGroupId })
    : null;
  const rewardsPath = currentGroupId
    ? link("/student/:groupId/rewards", { groupId: currentGroupId })
    : null;

  return (
    <header className="bg-background flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <img src="/images/coin.png" alt="" className="h-12 w-12" />
        <div>
          <p className="font-display text-xl font-bold leading-tight">
            Class Kudos
          </p>
          {firstName ? (
            <p className="text-sm opacity-70">Hi, {firstName}!</p>
          ) : null}
        </div>
      </div>

      <nav aria-label="Student" className="flex flex-wrap items-center gap-3">
        <NavLink href={groupsPath} active={pathname === groupsPath}>
          My Classes
        </NavLink>
        {kudosPath ? (
          <NavLink href={kudosPath} active={pathname === kudosPath}>
            My Kudos
          </NavLink>
        ) : null}
        {rewardsPath ? (
          <NavLink href={rewardsPath} active={pathname === rewardsPath}>
            Rewards
          </NavLink>
        ) : null}
      </nav>

      <a href={link("/user/logout")}>
        <Button variant="neutral" className="h-12 px-5 text-base font-bold">
          Log out
        </Button>
      </a>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a href={href} aria-current={active ? "page" : undefined}>
      <Button
        variant={active ? "green" : "default"}
        className="h-12 px-5 text-base font-bold"
      >
        {children}
      </Button>
    </a>
  );
}

/** `request.url` is absolute, but never trust it enough to throw a page away. */
function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

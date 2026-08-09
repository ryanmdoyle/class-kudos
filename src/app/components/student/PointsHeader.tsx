import { pluralKudos } from "./format";

/**
 * The "this is you, this is what you have" banner at the top of every
 * group-scoped student page.
 *
 * The number is the single most important thing on the screen for a nine-year
 * old, so it is set at `text-6xl` next to the coin and repeated in words
 * underneath for anyone still reading large numerals slowly.
 */
export function PointsHeader({
  firstName,
  lastName,
  groupName,
  points,
}: {
  firstName: string;
  lastName: string;
  groupName: string;
  points: number;
}) {
  return (
    <section className="neo-container bg-background flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <h1 className="text-3xl font-bold leading-tight">
          {firstName} {lastName}
        </h1>
        <p className="text-lg opacity-70">{groupName}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-6xl font-bold leading-none">{points}</p>
          <p className="text-sm opacity-70">{pluralKudos(points)} to spend</p>
        </div>
        <img src="/images/coin.png" alt="" className="h-16 w-16" />
      </div>
    </section>
  );
}

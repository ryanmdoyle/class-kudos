/**
 * Firing genuinely concurrent requests, and PROVING they overlapped.
 *
 * `src/db/index.ts` is unambiguous: the connection pool is created per-`Request`
 * with `max: 1`, keyed in a `WeakMap` on the Request object. So N promises
 * inside a single request all queue on one connection, and no race happens.
 *
 *   REAL CONCURRENCY MEANS N INDEPENDENT HTTP REQUESTS.
 *
 * That is what `inParallel` does — and `assertRealOverlap` is what stops a race
 * test from passing vacuously when they turn out not to have overlapped.
 */

export type Attempt<T> = {
  index: number;
  value?: T;
  error?: unknown;
  startedAt: number;
  endedAt: number;
};

export type ParallelReport<T> = {
  attempts: Attempt<T>[];
  /** Results of attempts that resolved. */
  fulfilled: T[];
  /** Errors from attempts that threw. */
  rejected: unknown[];
  wallClockMs: number;
  sumDurationsMs: number;
  /** sumDurations / wallClock. ~1 is serial, ~N is fully overlapped. */
  overlapFactor: number;
  /**
   * Peak number of requests in flight at any instant, computed by sweeping the
   * client-side start/end intervals. THE witness — see assertRealOverlap.
   */
  maxConcurrent: number;
};

export async function inParallel<T>(
  count: number,
  run: (index: number) => Promise<T>,
): Promise<ParallelReport<T>> {
  const startedAll = performance.now();

  /* Released in one microtask so no attempt pays for another's setup. */
  const attempts = await Promise.all(
    Array.from({ length: count }, async (_unused, index): Promise<Attempt<T>> => {
      const startedAt = performance.now();
      try {
        const value = await run(index);
        return { index, value, startedAt, endedAt: performance.now() };
      } catch (error) {
        return { index, error, startedAt, endedAt: performance.now() };
      }
    }),
  );

  const wallClockMs = performance.now() - startedAll;

  /* Sweep interval endpoints for true peak overlap. Ends sort before starts. */
  const events: [number, number][] = attempts.flatMap((a) => [
    [a.startedAt, 1],
    [a.endedAt, -1],
  ]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let inFlight = 0;
  let maxConcurrent = 0;
  for (const [, delta] of events) {
    inFlight += delta;
    if (inFlight > maxConcurrent) maxConcurrent = inFlight;
  }

  const sumDurationsMs = attempts.reduce(
    (total, a) => total + (a.endedAt - a.startedAt),
    0,
  );

  return {
    attempts,
    wallClockMs,
    sumDurationsMs,
    maxConcurrent,
    overlapFactor: sumDurationsMs / Math.max(wallClockMs, 0.001),
    fulfilled: attempts.filter((a) => !a.error).map((a) => a.value as T),
    rejected: attempts.filter((a) => a.error).map((a) => a.error),
  };
}

/**
 * !! CALL THIS IN EVERY RACE TEST — BUT KNOW EXACTLY WHAT IT PROVES. !!
 *
 * "Exactly one winner" passes trivially when the requests were SERIALISED, so a
 * race test needs some witness that they were not. This is that witness, and it
 * is WEAKER than it first appears. Be precise about it:
 *
 *   `maxConcurrent` proves the requests were all IN FLIGHT FROM THE CLIENT at the
 *   same time. It does NOT prove the server, or Postgres, interleaved them.
 *
 * Worse, on its own it is close to tautological: `inParallel` stamps every
 * `startedAt` in one synchronous tick, before any request is dispatched, so
 * `maxConcurrent` equals the request count unless the CALLER serialised the work.
 * Measured directly: four deliberately sequential 25ms tasks still report
 * `maxConcurrent = 4`.
 *
 * It is therefore kept for the one regression it genuinely catches — a race test
 * rewritten as a sequential `for (…) await …` loop, which drops it to 1 — and the
 * `overlapFactor` check below is the serialisation canary. In the same
 * measurement, serial work gave `overlapFactor` 2.52 where overlapped work gives
 * ≈4, so the ratio does discriminate once there are enough requests. Below four it
 * does not separate cleanly (serial tends to ≈(n+1)/2, overlapped to ≈n), so the
 * canary only applies at four or more, and a tighter timing assertion was
 * deliberately NOT added — it would be flaky on a shared CI runner without making
 * anything more trustworthy.
 *
 * WHAT ACTUALLY PROVES THESE TESTS EXERCISE THE COMPARE-AND-SWAP is mutation
 * testing, and it was run: deleting `.where("points", ">=", reward.cost)` from
 * `requestReward` turns the five-way redemption race RED, and turning
 * `StaleMoveError` into a `return` turns the location race RED. If you change the
 * race tests, re-run those mutations rather than trusting this helper alone.
 *
 * SUSPECTS when overlap is 1, in the order worth checking:
 *
 *  1. COLD DEV SERVER. The first request into an uncompiled module graph is
 *     serialised by Vite's transform and by rwsdk's `memoizeOnId` module loader.
 *     Always warm up with the same action first — `tests/setup/integrationSetup`
 *     does this per file, but a test hitting a code path nothing else touches
 *     may still pay it. Fix: call the action once before racing it.
 *  2. CONNECTION CEILING. Each concurrent request opens its own pool. Keep the
 *     count at or below 8. If `rejected` holds connection errors, this is it.
 *  3. PER-REQUEST CONNECT COST. Each request pays a fresh Postgres connection,
 *     which staggers when the statements actually land. This lowers
 *     `overlapFactor` but not `maxConcurrent` — which is exactly why the
 *     assertion is on the latter.
 *  4. NOT workerd. One isolate serves concurrent requests fine.
 *  5. NOT undici. Node opens a socket per in-flight request with no per-origin
 *     cap that would bite at these counts.
 */
export function assertRealOverlap(
  report: ParallelReport<unknown>,
  minimum = 2,
): void {
  if (report.maxConcurrent < minimum) {
    throw new Error(
      `requests were not concurrently in flight: maxConcurrent=${report.maxConcurrent} ` +
        `(needed >= ${minimum}), overlapFactor=${report.overlapFactor.toFixed(2)}, ` +
        `wallClock=${report.wallClockMs.toFixed(0)}ms.\n` +
        "  Since inParallel dispatches everything in one tick, this almost always " +
        "means the CALLER serialised the work — an `await` inside the loop, or a " +
        "rewrite to a sequential for-loop. The race under test never happened, so " +
        "any \"exactly one winner\" assertion here is vacuous.",
    );
  }

  /*
   * Serialisation canary. Only meaningful at four or more requests: serial work
   * tends to overlapFactor ≈ (n+1)/2 and overlapped work to ≈ n, which do not
   * separate at n = 2 or 3. The 0.6 coefficient sits below the overlapped value
   * and above the serial one for n >= 4, with room for a loaded CI runner.
   */
  const count = report.attempts.length;
  if (count >= 4) {
    const floor = count * 0.6;
    if (report.overlapFactor < floor) {
      throw new Error(
        `requests appear to have been processed SERIALLY: ` +
          `overlapFactor=${report.overlapFactor.toFixed(2)} across ${count} requests ` +
          `(expected >= ${floor.toFixed(2)}; fully overlapped is ~${count}, fully ` +
          `serial is ~${((count + 1) / 2).toFixed(2)}), ` +
          `wallClock=${report.wallClockMs.toFixed(0)}ms, ` +
          `sumDurations=${report.sumDurationsMs.toFixed(0)}ms.\n` +
          "  A cold dev server is the usual cause — the first request into an " +
          "uncompiled module graph is serialised by Vite's transform and by rwsdk's " +
          "module loader. Warm the code path before racing it. See the SUSPECTS " +
          "list in tests/helpers/parallel.ts.",
      );
    }
  }
}

/** Summary line worth logging when a race test fails. */
export function describeReport(report: ParallelReport<unknown>): string {
  return (
    `${report.attempts.length} requests, maxConcurrent=${report.maxConcurrent}, ` +
    `overlapFactor=${report.overlapFactor.toFixed(2)}, ` +
    `wallClock=${report.wallClockMs.toFixed(0)}ms, ` +
    `fulfilled=${report.fulfilled.length}, rejected=${report.rejected.length}`
  );
}

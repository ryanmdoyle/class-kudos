import { describe, expect, it } from "vitest";

import { testDb } from "../helpers/db";
import { seededTeacherId, withFixture } from "../helpers/fixtures";
import { describeReport, inParallel } from "../helpers/parallel";
import { createClient } from "../helpers/rsc";

/**
 * The harness testing itself.
 *
 * These assert nothing about Class Kudos. They exist because every concurrency
 * test in this suite is only as meaningful as the harness's ability to issue
 * genuinely overlapping requests — and if that ability regresses, those tests do
 * not fail, they silently start passing for the wrong reason. This file is what
 * fails instead.
 */
describe("harness self-check", () => {
  it("issues genuinely concurrent requests", async () => {
    /* Warm the path: a cold module graph serialises the first request through it. */
    await createClient().action("loadPendingGroup", []);

    const report = await inParallel(6, () =>
      createClient().action("loadPendingGroup", []),
    );

    expect(report.rejected).toEqual([]);
    /*
     * Locally this is 6/6 with an overlap factor near 6. The assertion is
     * deliberately loose — 2 is the point at which a race is possible at all,
     * and anything stricter would make this flaky on a loaded CI runner without
     * making the race tests any more trustworthy.
     */
    expect(report.maxConcurrent, describeReport(report)).toBeGreaterThanOrEqual(2);
  });

  it("builds and tears down a fixture without leaking rows", async () => {
    const before = await countTestGroups();

    const fixture = await withFixture({
      students: 2,
      points: 5,
      rewards: [["Sit anywhere", 5]],
      label: "selfcheck",
    });

    expect(fixture.teacherId).toBe(await seededTeacherId());
    expect(fixture.sharedCode).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    expect(fixture.students).toHaveLength(2);
    expect(await countTestGroups()).toBe(before + 1);

    await fixture.cleanup();
    expect(await countTestGroups()).toBe(before);

    const survivors = await testDb()
      .selectFrom("users")
      .select("id")
      .where(
        "id",
        "in",
        fixture.students.map((s) => s.userId),
      )
      .execute();
    expect(survivors).toEqual([]);
  });
});

async function countTestGroups(): Promise<number> {
  const row = await testDb()
    .selectFrom("groups")
    .select(({ fn }) => fn.countAll<string>().as("n"))
    .where("name", "like", "zz-test-%")
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

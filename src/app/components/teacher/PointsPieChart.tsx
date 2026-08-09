"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart, ResponsiveContainer } from "recharts";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import type { KudosWithUser } from "@/app/lib/types";

export const description =
  "A donut chart breaking down how many kudos each student has received in total.";

/**
 * WHY THIS TALKS TO RECHARTS DIRECTLY
 *
 * The legacy version was built on shadcn's `@/app/components/ui/chart` wrapper
 * (ChartContainer / ChartTooltip / ChartTooltipContent). That wrapper does not
 * type-check against recharts 3.x — `TooltipProps` and `LegendProps` no longer
 * expose `payload` / `label`, which is exactly what its props were built from.
 * The wrapper had no other consumers, so it was deleted rather than repaired.
 *
 * Colours are applied per-slice with <Cell fill>. There is no hover tooltip: the
 * legend below lists every slice with its value, so the same information is
 * available without pointing at anything — which is the better answer on a
 * classroom projector, and the only answer for a teacher reading it from the
 * back of the room.
 */

/**
 * Categorical hues, assigned in fixed order and NEVER cycled.
 *
 * The previous version cycled five colours with `index % 5`, so in a class of
 * thirty the 1st and 6th students were painted identically — and the legend
 * only listed the top eight, leaving the other twenty-two slices coloured but
 * unlabelled. Two students with the same swatch and no label is not a chart.
 *
 * A donut cannot carry thirty categories no matter how many hues exist, so the
 * fix is structural rather than chromatic: show the top seven by name and fold
 * everyone else into a single recessive "Other" slice. Every slice on screen now
 * has exactly one hue and exactly one legend entry.
 */
const CATEGORICAL = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
];

const NAMED_SLICES = CATEGORICAL.length;

type Slice = {
  student: string;
  kudos: number;
  fill: string;
  /** How many students this slice represents — >1 only for "Other". */
  studentCount: number;
};

export function PointsPieChart({ kudos }: { kudos: KudosWithUser[] }) {
  const chartData = React.useMemo<Slice[]>(() => {
    const byStudent = new Map<string, { name: string; total: number }>();

    for (const kudo of kudos) {
      const existing = byStudent.get(kudo.userId);
      if (existing) {
        existing.total += kudo.value;
      } else {
        byStudent.set(kudo.userId, {
          name: `${kudo.user.firstName} ${kudo.user.lastName}`,
          total: kudo.value,
        });
      }
    }

    const ranked = Array.from(byStudent.values()).sort(
      (a, b) => b.total - a.total,
    );

    const named = ranked.slice(0, NAMED_SLICES).map((entry, index) => ({
      student: entry.name,
      kudos: entry.total,
      fill: CATEGORICAL[index]!,
      studentCount: 1,
    }));

    const rest = ranked.slice(NAMED_SLICES);

    if (rest.length === 0) {
      return named;
    }

    return [
      ...named,
      {
        // Named when it is a single student, so an 8th pupil is not anonymised
        // as "1 others" — but still painted with the recessive tone, because
        // every categorical hue is already spoken for.
        student: rest.length === 1 ? rest[0]!.name : `${rest.length} others`,
        kudos: rest.reduce((sum, entry) => sum + entry.total, 0),
        fill: "var(--cat-other)",
        studentCount: rest.length,
      },
    ];
  }, [kudos]);

  const totalKudos = React.useMemo(
    () => chartData.reduce((sum, slice) => sum + slice.kudos, 0),
    [chartData],
  );

  return (
    <Card className="flex flex-col bg-background text-foreground">
      <CardHeader className="items-center pb-0">
        <CardTitle>Total Kudos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[250px] w-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="kudos"
                nameKey="student"
                innerRadius={60}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {chartData.map((slice) => (
                  <Cell key={slice.student} fill={slice.fill} />
                ))}
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                      return null;
                    }
                    const cx = viewBox.cx ?? 0;
                    const cy = viewBox.cy ?? 0;
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={cx}
                          y={cy}
                          className="fill-foreground text-3xl font-display font-bold"
                        >
                          {totalKudos.toLocaleString()}
                        </tspan>
                        <tspan x={cx} y={cy + 24} className="fill-foreground">
                          Kudos
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Every slice is listed — never truncated. Identity is carried by the
            label, not by colour alone, which is also what keeps the chart
            readable for a colour-blind teacher and on a washed-out projector. */}
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {chartData.map((slice) => (
            <li key={slice.student} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-[2px] border border-border"
                style={{ backgroundColor: slice.fill }}
              />
              <span>{slice.student}</span>
              <span className="font-bold">{slice.kudos}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          {chartData.some((slice) => slice.studentCount > 1)
            ? `Top ${NAMED_SLICES} students by kudos; everyone else is grouped.`
            : "Total kudos given to each student."}
        </div>
      </CardFooter>
    </Card>
  );
}

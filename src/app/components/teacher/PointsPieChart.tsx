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
 * NOTE ON THE MISSING shadcn CHART WRAPPER
 *
 * The legacy version of this component was built on `@/app/components/ui/chart`
 * (ChartContainer / ChartTooltip / ChartTooltipContent). That wrapper does not
 * type-check against recharts 3.x — `TooltipProps` and `LegendProps` no longer
 * expose `payload` / `label`, which is what the wrapper's props are built from.
 * That file is outside this area's ownership, so rather than rewrite someone
 * else's module this component talks to recharts directly.
 *
 * What is lost is the wrapper's CSS-variable plumbing and its themed tooltip.
 * Colours are therefore applied per-slice with <Cell fill>, reading the same
 * --chart-N custom properties the wrapper would have injected, and there is no
 * hover tooltip — the legend below the chart carries the same information
 * statically, which on a projector is arguably the better answer anyway.
 */

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Slice = { student: string; kudos: number; fill: string };

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

    return Array.from(byStudent.values())
      .sort((a, b) => b.total - a.total)
      .map((entry, index) => ({
        student: entry.name,
        kudos: entry.total,
        fill: CHART_COLORS[index % CHART_COLORS.length]!,
      }));
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

        {/* The legend replaces the tooltip the shadcn wrapper used to provide. */}
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {chartData.slice(0, 8).map((slice) => (
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
          Total kudos given to each student.
        </div>
      </CardFooter>
    </Card>
  );
}

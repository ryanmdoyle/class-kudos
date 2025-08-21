"use client"

import { Label, Pie, PieChart } from "recharts"
import { KudosWithUser } from "@/app/lib/types"

import * as React from "react"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart"

export const description = "A donut chart that breaks down how many kudos each student has recieved, in total."

// Chart colors in CSS variables
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function PointsPieChart({ kudos }: { kudos: KudosWithUser[] }) {
  // Group kudos by student and sum their total values
  const chartData = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; fill: string }
    >()

    kudos.forEach((k) => {
      const fullName = `${k.user.firstName} ${k.user.lastName}`
      if (!map.has(k.userId)) {
        const color = chartColors[map.size % chartColors.length] // cycle colors
        map.set(k.userId, { name: fullName, total: 0, fill: color })
      }
      map.get(k.userId)!.total += k.value
    })

    return Array.from(map.values()).map((d) => ({
      student: d.name,
      kudos: d.total,
      fill: d.fill,
    }))
  }, [kudos])

  const totalKudos = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.kudos, 0),
    [chartData]
  )

  // Build config dynamically for ChartContainer
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = { kudos: { label: "Kudos" } }
    chartData.forEach((d) => {
      config[d.student] = { label: d.student, color: d.fill }
    })
    return config
  }, [chartData])

  return (
    <Card className="flex flex-col bg-background text-foreground">
      <CardHeader className="items-center pb-0">
        <CardTitle>Total Kudos</CardTitle>
        {/* <CardDescription>by student</CardDescription> */}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="kudos"
              nameKey="student"
              innerRadius={60}
              strokeWidth={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-display font-bold"
                        >
                          {totalKudos.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-foreground"
                        >
                          Kudos
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Shows the total kudos given to each student.
        </div>
      </CardFooter>
    </Card>
  )
}
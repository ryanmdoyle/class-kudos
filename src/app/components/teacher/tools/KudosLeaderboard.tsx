"use client"

import { KudosWithUser } from "@/app/lib/types"
import * as React from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"

export const description = "A leaderboard showing the top 10 students by kudos earned."

type LeaderboardEntry = {
  rank: number
  name: string
  kudos: number
  userId: string
}

export function KudosLeaderboard({ kudos }: { kudos: KudosWithUser[] }) {
  // Group kudos by student and sum their total values
  const leaderboardData = React.useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()

    kudos.forEach((k) => {
      const fullName = `${k.user.firstName} ${k.user.lastName}`
      if (!map.has(k.userId)) {
        map.set(k.userId, { name: fullName, total: 0 })
      }
      map.get(k.userId)!.total += k.value
    })

    // Convert to array, sort by kudos (descending), and take top 3
    return Array.from(map.entries())
      .map(([userId, data]) => ({
        rank: 0, // Will be set after sorting
        name: data.name,
        kudos: data.total,
        userId,
      }))
      .sort((a, b) => b.kudos - a.kudos)
      .slice(0, 3)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [kudos])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <div className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {rank}
          </div>
        )
    }
  }

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
      case 2:
        return "bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800"
      case 3:
        return "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
      default:
        return "bg-muted/30 border-muted"
    }
  }

  return (
    <Card className="flex flex-col bg-secondary-background text-foreground">
      <CardHeader className="items-center pb-0">
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-6 py-4">
        <div className="space-y-2">
          {leaderboardData.length > 0 ? (
            leaderboardData.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg border ${getRankStyles(
                  entry.rank
                )}`}
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(entry.rank)}
                  <div>
                    <div className="font-medium">{entry.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {entry.kudos.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">kudos</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No kudos data available
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Top {Math.min(10, leaderboardData.length)} students by total kudos earned.
        </div>
      </CardFooter>
    </Card>
  )
}
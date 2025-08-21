"use client";

import { RandomStudentButton } from "./RandomStudentButton";
import { RandomGroupsButton } from "./RandomGroupsButton";
import { Name } from "@/app/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"

export function GroupTools({ names }: { names: Name[] }) {
  return (
    <Card className="w-auto bg-background neo-container">
      <CardHeader>
        <CardTitle>Group Tools</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <RandomStudentButton names={names} />
        <RandomGroupsButton names={names} />
      </CardContent>
    </Card>
  )
}
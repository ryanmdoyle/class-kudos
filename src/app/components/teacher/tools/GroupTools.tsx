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
import { Button } from "../../ui/button";
import { link } from "@/app/shared/links";

export function GroupTools({ names, groupId }: { names: Name[], groupId: string }) {
  return (
    <Card className="w-auto bg-background neo-container">
      <CardHeader>
        <CardTitle>Group Tools</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <RandomStudentButton names={names} />
        <RandomGroupsButton names={names} />
        <a href={link("/teacher/:groupId/travel-log", { groupId })}>
          <Button variant="neutral">View Travel Log</Button>
        </a>
      </CardContent>
    </Card>
  )
}
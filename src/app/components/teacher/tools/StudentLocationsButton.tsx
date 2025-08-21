"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { useState } from "react";
import { Name } from "@/app/lib/types";

type Group = {
  groupNumber: number;
  members: Name[];
}

export function StudentLocations({ names }: { names: Name[] }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [numGroups, setNumGroups] = useState<string>("")
  const [showGroups, setShowGroups] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  function createGroups(numberOfGroups: number) {
    if (!names || names.length === 0 || numberOfGroups <= 0) {
      return []
    }

    // Shuffle the names array
    const shuffledNames = shuffleArray(names)

    // Initialize groups
    const newGroups: Group[] = Array.from({ length: numberOfGroups }, (_, i) => ({
      groupNumber: i + 1,
      members: []
    }))

    // Distribute students across groups
    shuffledNames.forEach((name, index) => {
      const groupIndex = index % numberOfGroups
      newGroups[groupIndex].members.push(name)
    })

    return newGroups
  }

  function handleCreateGroups() {
    const num = parseInt(numGroups)
    if (isNaN(num) || num <= 0) {
      return
    }

    const newGroups = createGroups(num)
    setGroups(newGroups)
    setShowGroups(true)
    setDialogOpen(false)
    setNumGroups("")
  }

  function handleCancel() {
    setNumGroups("")
    setDialogOpen(false)
  }

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="neutral">Create Random Groups</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create Random Groups</AlertDialogTitle>
            <AlertDialogDescription>
              How many groups would you like to create from {names?.length || 0} students?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="numGroups" className="text-sm font-medium">
              Number of Groups
            </Label>
            <Input
              id="numGroups"
              type="number"
              min="1"
              max={names?.length || 1}
              value={numGroups}
              onChange={(e) => setNumGroups(e.target.value)}
              placeholder="Enter number of groups"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateGroups}>
              Create Groups
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Groups Display Dialog */}
      <AlertDialog open={showGroups} onOpenChange={setShowGroups}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Random Groups Created</AlertDialogTitle>
            <AlertDialogDescription>
              Students have been randomly distributed into {groups.length} groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {groups.map((group) => (
              <div key={group.groupNumber} className="border rounded-lg p-3">
                <h3 className="font-semibold mb-2">Group {group.groupNumber}</h3>
                <div className="space-y-1">
                  {group.members.map((member, index) => (
                    <div key={index} className="text-sm">
                      {member.firstName} {member.lastName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowGroups(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
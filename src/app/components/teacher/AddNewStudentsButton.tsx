// This component is used to create new students and instantly enroll them into a group, along with an access code to.
"use client";

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
import { useState } from 'react';
import { Button } from '@/app/components/ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea';
import { addGroup, createNewStudents } from './functions'

type PreviewUser = {
  firstName: string
  lastName: string
  username: string
}


export function AddNewStudentsButton({ groupId }: { groupId: string }) {
  const [namesInput, setNamesInput] = useState("")
  const [preview, setPreview] = useState<PreviewUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    createNewStudents(preview, groupId)
  }

  function generateUsername(first: string, last: string): string {
    const base = (first[0] + last).toLowerCase().replace(/[^a-z0-9]/g, "")
    const rand = Math.floor(100 + Math.random() * 900) // random 3 digit number
    return `${base}${rand}`
  }

  function handlePreview() {
    setError(null)
    const lines = namesInput.split("\n").map(line => line.trim()).filter(Boolean)

    const parsed: PreviewUser[] = []
    for (const line of lines) {
      const parts = line.split(" ").filter(Boolean)
      if (parts.length < 2) {
        setError(`Invalid name: "${line}". Please provide first and last name.`)
        return
      }
      const [first, ...rest] = parts
      const last = rest.join(" ")
      parsed.push({
        firstName: first,
        lastName: last,
        username: generateUsername(first, last),
      })
    }
    setPreview(parsed)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="absolute top-4 right-4" variant="green">Add New Students</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Student Accounts</AlertDialogTitle>
          <AlertDialogDescription>
            This will create new user accounts for students, and add them to your group. An access code will also be created for students to use to login to their own dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-4 max-h-[400px]">

          <Textarea
            value={namesInput}
            onChange={e => setNamesInput(e.target.value)}
            placeholder="Enter one student per line (First Last)"
            rows={6}
          />
          {preview.length > 0 && (
            <div className="border rounded-md p-2 overflow-y-auto">
              <h3 className="font-semibold mb-2">Preview Users</h3>
              <ul className="space-y-1">
                {preview.map((u, i) => (
                  <li key={i} className="text-sm">
                    <strong>{u.firstName} {u.lastName}</strong> → <code>{u.username}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {error && <p className="text-red-500">{error}</p>}

        <Button onClick={handlePreview}>Preview</Button>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>Create Users!</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  )
}
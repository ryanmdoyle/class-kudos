import { db } from "@/db";
import { StudentAccessCodeButton } from "./StudentAccessCodeButton";

export async function StudentAccessCodeCell({ userId }: { userId: string }) {
  const accessCode = await db.accessCode.findFirst({
    where: {
      userId,
      used: false,                // only codes that haven’t been used
      expiresAt: { gte: new Date() } // only not expired
    },
    orderBy: { expiresAt: "desc" },  // most recent first
    select: { code: true },          // only return the code string
  })
  return (
    <div className="flex gap-2 justify-end items-center">
      <span className="text-lg font-code">{accessCode && accessCode.code}</span>
      <StudentAccessCodeButton userId={userId} />
    </div>
  )
}
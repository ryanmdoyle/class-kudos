"use server";

import { db } from "@/db";
import { nanoid } from 'nanoid';

export async function createAccessCodesForUsers(
  userIds: string[],
  expiresInMinutes: number = 525600 // 1 year (code works for 1 school year)
): Promise<{ code: string; count: number }> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  // Invalidate existing access codes for these users
  await db.accessCode.updateMany({
    where: { userId: { in: userIds } },
    data: { used: true }
  });

  // Generate one code for all users
  const code = nanoid(6);

  // Create access codes for all users at once
  await db.accessCode.createMany({
    data: userIds.map(userId => ({
      code,
      expiresAt,
      userId,
      used: false
    }))
  });

  return { code, count: userIds.length };
}
"use server";

import { db, Enrollment, Reward } from "@/db";
import { requestInfo } from "rwsdk/worker";
import { EnrollmentWithUser } from '@/app/lib/types';

export async function addEnrollment(formData: FormData) {
  const { ctx } = requestInfo;

  try {
    const enrollId = formData.get("enrollId") as string;
    if (!enrollId) {
      return { success: false, error: "Group enroll ID is required." };
    }

    const userId = ctx.user?.id;
    if (!userId) {
      return { success: false, error: "Not authenticated." };
    }

    // Look up the group by the enroll Id
    const group = await db.group.findUnique({
      where: { enrollId }
    });

    // Create an enrollment with user and group id's
    if (group) {
      await db.enrollment.create({
        data: {
          userId: userId,
          groupId: group.id,
        },
      })
      return { success: true, error: null };
    } else {
      return { success: false, error: "No group found with that ID." };
    }

  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function requestReward(reward: Reward, enrollment: EnrollmentWithUser) {
  const { ctx } = requestInfo;
  if (!ctx.user?.id) return { success: false, error: "User must be logged in." }

  try {
    await db.redeemed.create({
      data: {
        userId: ctx.user?.id,
        groupId: enrollment.groupId,
        cost: reward.cost,
        name: reward.name,
      }
    });

    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        points: { decrement: reward.cost }
      }
    })

    return { success: true, error: null };

  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
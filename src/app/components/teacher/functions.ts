"use server";

import { db, KudosType, Redeemed } from "@/db";
import { nanoid } from 'nanoid';
import { requestInfo } from "rwsdk/worker";
import { EnrollmentWithUser } from "@/app/lib/types";

export async function addGroup(formData: FormData) {
  const { ctx } = requestInfo;
  const shortId = nanoid(9);
  try {
    const name = formData.get("name") as string;
    if (!name) {
      return { success: false, error: "Group name is required." };
    }

    const ownerId = ctx.user?.id;
    if (!ownerId) {
      return { success: false, error: "Not authenticated." };
    }

    // Create the group
    await db.group.create({
      data: {
        name,
        ownerId,
        enrollId: shortId,
      },
    });

    return { success: true, error: null };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function addKudoType(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const value = Number(formData.get("value"));
    const groupId = formData.get("groupId") as string;

    if (!name || !groupId || isNaN(value)) {
      return { success: false, error: "All fields are required." };
    }

    await db.kudosType.create({
      data: {
        name,
        value,
        groupId,
      },
    });

    return { success: true, error: null };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function addReward(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const cost = Number(formData.get("cost"));
    const groupId = formData.get("groupId") as string;

    if (!name || !groupId || isNaN(cost)) {
      return { success: false, error: "All fields are required." };
    }

    await db.reward.create({
      data: {
        name,
        cost,
        groupId,
      },
    });

    return { success: true, error: null };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function addKudos(kudosType: KudosType, selected: EnrollmentWithUser[]) {
  try {
    if (!kudosType || !selected || selected.length === 0) {
      return { success: false, error: "Kudos type and at least one user are required." };
    }

    const results = await Promise.all(
      selected.map(async (enrollment) => {
        // 1. Create the Kudo
        await db.kudos.create({
          data: {
            name: kudosType.name,
            value: kudosType.value,
            groupId: kudosType.groupId,
            userId: enrollment.userId,
          },
        });

        // 2. Update the enrollment's points
        await db.enrollment.update({
          where: { id: enrollment.id },
          data: {
            points: enrollment.points + kudosType.value,
          },
        });

        // 3. Update the groups point total
        await db.group.update({
          where: { id: enrollment.groupId },
          data: {
            rewardedPoints: { increment: kudosType.value }
          }
        })
      })
    );

    return { success: true, error: null, updated: results.length };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getUpdatedEnrollments(groupId: string) {
  try {

    const enrollments = await db.enrollment.findMany({
      where: { groupId: groupId },
      include: { user: true }
    });

    return { success: true, error: null, data: enrollments };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function approveRedeemed(redeemed: Redeemed) {
  const updated = await db.redeemed.update({
    where: { id: redeemed.id },
    data: { reviewed: true, reviewedAt: new Date() }
  })
  return { success: true, error: null, data: updated };
}

export async function cancelRedeemed(redeemed: Redeemed) {
  await db.redeemed.delete({
    where: { id: redeemed.id },
  })

  await db.enrollment.update({
    where: {
      userId_groupId: {
        userId: redeemed.userId,
        groupId: redeemed.groupId,
      },
    },
    data: { points: { increment: redeemed.cost } }
  })

  return { success: true, error: null };
}

export async function editEnrolled(formData: FormData) {
  const userId = formData.get("userId") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  try {
    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName,
        lastName,
      }
    })

    return { success: true, error: null, data: updatedUser };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function editKudoType(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const valueString = formData.get("value");
  const value = (typeof valueString === "string") ? Number(valueString) : 1;

  try {
    const updatedKudoType = await db.kudosType.update({
      where: {
        id: id,
      },
      data: {
        name,
        value,
      }
    })

    return { success: true, error: null, data: updatedKudoType };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function editReward(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const costString = formData.get("cost");
  const cost = (typeof costString === "string") ? Number(costString) : 0;

  try {
    const updatedReward = await db.reward.update({
      where: {
        id: id,
      },
      data: {
        name,
        cost,
      }
    })

    return { success: true, error: null, data: updatedReward };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function createStudentResetCode(userId: string): Promise<{ code?: string, success: boolean, error: string | null }> {
  try {
    // 1. Generate reset code
    const code = nanoid(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

    // 2. Remove other resetCodes
    await db.resetCode.deleteMany({
      where: { userId }
    })

    // 3. Create a new resetCode
    const resetCode = await db.resetCode.create({
      data: {
        userId,
        code,
        expiresAt,
        used: false,
      },
    })

    return { success: true, error: null, code: resetCode.code };
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteKudoType(id: string): Promise<{ success: boolean, error?: string | null }> {
  try {
    const result = await db.kudosType.delete({
      where: { id }
    })
    if (result) return { success: true }
    return { success: false, error: "Something went wrong!" }
  } catch (err) {
    return { success: false, error: err as string }
  }
}

export async function deleteReward(id: string): Promise<{ success: boolean, error?: string | null }> {
  try {
    const result = await db.reward.delete({
      where: { id }
    })
    if (result) return { success: true }
    return { success: false, error: "Something went wrong!" }
  } catch (err) {
    return { success: false, error: err as string }
  }
}

export async function archiveGroup(id: string): Promise<{ success: boolean; error?: string | null }> {
  try {
    await db.group.update({
      where: { id },
      data: { archived: true },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to archive group:", error);
    return {
      success: false,
      error: error.message ?? "Unknown error",
    };
  }
}
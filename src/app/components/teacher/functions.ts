"use server";

import { db, KudosType, Redeemed } from "@/db";
import { nanoid } from 'nanoid';
import { requestInfo } from "rwsdk/worker";
import { EnrollmentWithUser } from "@/app/lib/types";
import { UserRole } from "@generated/prisma/enums";

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

    // Group by groupId to batch group updates
    const groupUpdates = new Map<string, number>();

    // Prepare all operations
    const kudosData = selected.map(enrollment => {
      const currentGroupTotal = groupUpdates.get(enrollment.groupId) || 0;
      groupUpdates.set(enrollment.groupId, currentGroupTotal + kudosType.value);

      return {
        name: kudosType.name,
        value: kudosType.value,
        groupId: kudosType.groupId,
        userId: enrollment.userId,
      };
    });

    const enrollmentUpdates = selected.map(enrollment => ({
      where: { id: enrollment.id },
      data: { points: { increment: kudosType.value } }
    }));

    // Execute database calls
    await db.kudos.createMany({ data: kudosData });

    await Promise.all(
      enrollmentUpdates.map(update => db.enrollment.update(update))
    );

    await Promise.all(
      Array.from(groupUpdates.entries()).map(([groupId, points]) =>
        db.group.update({
          where: { id: groupId },
          data: { rewardedPoints: { increment: points } }
        })
      )
    );

    return { success: true, error: null, updated: selected.length };
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

export async function createStudentAccessCode(userId: string): Promise<{ code?: string, success: boolean, error: string | null }> {
  try {
    // 1. Generate reset code
    const code = nanoid(6);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 5 minutes from now

    // 2. Remove other accessCodes
    await db.accessCode.deleteMany({
      where: { userId }
    })

    // 3. Create a new accessCode
    const accessCode = await db.accessCode.create({
      data: {
        userId,
        code,
        expiresAt,
        used: false,
      },
    })

    return { success: true, error: null, code: accessCode.code };
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

async function ensureUniqueUsername(username: string): Promise<string> {
  let uniqueUsername = username
  let exists = await db.user.findUnique({ where: { username: uniqueUsername } })

  while (exists) {
    // Replace last 3 digits with a new random 3-digit number
    uniqueUsername = uniqueUsername.replace(/\d{3}$/, () =>
      Math.floor(100 + Math.random() * 900).toString()
    )
    exists = await db.user.findUnique({ where: { username: uniqueUsername } })
  }

  return uniqueUsername
}

export async function createNewStudents(preview: { firstName: string; lastName: string, username: string }[], groupId: string) {
  // Generate usernames (unique)
  const usersToCreate = await Promise.all(
    preview.map(async (student) => {
      const username = await ensureUniqueUsername(student.username)
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        username,
        role: "STUDENT" as UserRole,
      }
    })
  )

  // Insert users
  const createdUsers = await db.user.createMany({
    data: usersToCreate,
  })

  // Fetch inserted users (because createMany doesn’t return them, just the number of users created)
  const insertedUsers = await db.user.findMany({
    where: { username: { in: usersToCreate.map((u) => u.username) } },
  })

  // Create enrollments
  await db.enrollment.createMany({
    data: insertedUsers.map((u) => ({
      userId: u.id,
      groupId,
    })),
  })

  // Generate one shared access code
  const accessCode = nanoid(6)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

  await db.accessCode.createMany({
    data: insertedUsers.map((u) => ({
      code: accessCode,
      expiresAt,
      userId: u.id,
    })),
  })

  return {
    accessCode,
    users: insertedUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      username: u.username,
    })),
  }
}

export async function addLocation(formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const groupId = formData.get('groupId') as string;

  // Add your Prisma logic here
  await db.location.create({
    data: {
      name,
      color,
      groupId,
    }
  });
}

export async function editLocation(formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const id = formData.get('id') as string;

  // Add your Prisma logic here
  await db.location.update({
    where: { id },
    data: {
      name,
      color,
    }
  });
}

export async function deleteLocation(id: string): Promise<{ success: boolean, error?: string | null }> {
  try {
    const result = await db.location.update({
      where: { id },
      data: { isActive: false }
    })
    if (result) return { success: true }
    return { success: false, error: "Something went wrong!" }
  } catch (err) {
    return { success: false, error: err as string }
  }
}
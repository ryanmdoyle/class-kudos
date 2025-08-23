"use server";

import { db } from "@/db"

export async function updateLocation(enrollmentId: string, newLocationId: string | null) {
  const now = new Date()

  // Step 1: Fetch enrollment with relations
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: true,
      group: true,
      currentLocation: true,
    },
  })

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`)
  }

  // Step 2: Short-circuit if location is the same
  if (enrollment.currentLocationId === newLocationId) {
    return enrollment
  }

  // We’ll need these to roll back if something fails
  const prevLocationId = enrollment.currentLocationId

  try {
    // Step 3: End the last LocationHistory if exists
    if (prevLocationId) {
      const lastHistory = await db.locationHistory.findFirst({
        where: {
          userId: enrollment.userId,
          groupId: enrollment.groupId,
          locationId: prevLocationId,
          leftAt: null,
        },
        orderBy: { arrivedAt: "desc" },
      })

      if (lastHistory) {
        await db.locationHistory.update({
          where: { id: lastHistory.id },
          data: {
            leftAt: now,
            duration: Math.floor((now.getTime() - lastHistory.arrivedAt.getTime()) / (1000 * 60)),
          },
        })
      }
    }

    // Step 4: Update enrollment
    const updatedEnrollment = await db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        currentLocationId: newLocationId,
        locationUpdatedAt: now,
      },
      include: { currentLocation: true },
    })

    // Step 5: Create new LocationHistory (if moving to a real location)
    if (newLocationId) {
      await db.locationHistory.create({
        data: {
          userId: enrollment.userId,
          groupId: enrollment.groupId,
          locationId: newLocationId,
          arrivedAt: now,
        },
      })
    }

    return updatedEnrollment
  } catch (err) {
    console.error("updateLocation failed, attempting rollback:", err)

    // --- Rollback attempt ---
    try {
      await db.enrollment.update({
        where: { id: enrollmentId },
        data: {
          currentLocationId: prevLocationId,
          locationUpdatedAt: now,
        },
      })
    } catch (rollbackErr) {
      console.error("Rollback also failed!", rollbackErr)
    }

    throw err
  }
}

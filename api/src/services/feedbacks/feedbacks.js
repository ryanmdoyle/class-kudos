import { db } from 'src/lib/db'

import { updateEnrollmentPoints } from '../enrollments/enrollments'
import { updateGroupRewarded } from '../groups/groups'

export const feedbacks = () => {
  return db.feedback.findMany()
}

export const feedback = ({ id }) => {
  return db.feedback.findUnique({
    where: { id },
  })
}

export const feedbackOfUser = ({ userId, groupId, take = 10 }) => {
  return db.feedback.findMany({
    where: {
      userId: { equals: userId },
      groupId: { equals: groupId },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: take,
  })
}

export const createFeedback = async ({ input }) => {
  // For each feedback given, the value should be added to awardedPoints on Group, and to points on the Enrollments
  // awardedPoints on the group is to track totals, the points on enrollments are used as group totals.
  // Feedback is used to track why points were awarded, but not used to calculate balances for enrollments or groups.

  //add points on group
  await updateGroupRewarded({
    groupId: input.groupId,
    updateValue: input.value,
  })
  // add points on enrollment
  await updateEnrollmentPoints({
    userId: input.userId,
    groupId: input.groupId,
    updateValue: input.value,
  })
  // finally create feedback
  return db.feedback.create({
    data: input,
  })
}

export const updateFeedback = ({ id, input }) => {
  return db.feedback.update({
    data: input,
    where: { id },
  })
}

export const deleteFeedback = async ({ id }) => {
  //remove points on group
  const feedback = await db.feedback.findUnique({
    where: { id },
  })
  await updateGroupRewarded({
    groupId: feedback.groupId,
    updateValue: -feedback.value,
  })
  // remove points on enrollment
  await updateEnrollmentPoints({
    userId: feedback.userId,
    groupId: feedback.groupId,
    updateValue: -feedback.value,
  })
  return db.feedback.delete({
    where: { id },
  })
}

export const Feedback = {
  user: (_obj, { root }) => {
    return db.feedback.findUnique({ where: { id: root?.id } }).user()
  },
  group: (_obj, { root }) => {
    return db.feedback.findUnique({ where: { id: root?.id } }).group()
  },
}

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

export const createFeedback = async ({ input }) => {
  // For each feedback given, the value should be added to awardedPoints on Group, and to points on the Enrollments
  // awardedPoints on the group is to track totals, the points on enrollments are used as group totals.
  // Feedback is used to track why points were awarded, but not used to calculate balances for enrollments or groups.

  //add points on group
  updateGroupRewarded({
    groupId: input.groupId,
    updateValue: input.value,
  }).then()
  // add points on enrollment
  updateEnrollmentPoints({
    userId: input.userId,
    groupId: input.groupId,
    updateValue: input.value,
  }).then()
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

export const deleteFeedback = ({ id }) => {
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

import { db } from 'src/lib/db'

import { updateEnrollmentPoints } from '../enrollments/enrollments'

export const redeemeds = () => {
  return db.redeemed.findMany()
}

export const redeemed = ({ id }) => {
  return db.redeemed.findUnique({
    where: { id },
  })
}

export const createRedeemed = async ({ input }) => {
  await updateEnrollmentPoints({
    userId: input.userId,
    groupId: input.groupId,
    updateValue: -input.cost,
  })
  return db.redeemed.create({
    data: input,
  })
}

export const updateRedeemed = ({ id, input }) => {
  return db.redeemed.update({
    data: input,
    where: { id },
  })
}

export const deleteRedeemed = ({ id }) => {
  return db.redeemed.delete({
    where: { id },
  })
}

export const approveRedeemed = ({ id }) => {
  return db.redeemed.update({
    where: { id },
    data: {
      reviewed: true,
      reviewedAt: new Date(),
    },
  })
}

export const redeemedOfStudent = ({ input }) => {
  return db.redeemed.findMany({
    where: {
      userId: input.userId,
      groupId: input.groupId,
    },
  })
}

export const redeemedOfGroupRequested = ({ groupId }) => {
  return db.redeemed.findMany({
    where: {
      groupId: groupId,
      reviewed: false,
    },
  })
}

export const redeemedOfGroupApproved = ({ groupId }) => {
  return db.redeemed.findMany({
    where: {
      groupId: groupId,
      reviewed: true,
    },
  })
}

export const Redeemed = {
  user: (_obj, { root }) => {
    return db.redeemed.findUnique({ where: { id: root?.id } }).user()
  },
  group: (_obj, { root }) => {
    return db.redeemed.findUnique({ where: { id: root?.id } }).group()
  },
}

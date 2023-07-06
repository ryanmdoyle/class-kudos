import { db } from 'src/lib/db'

export const redeemeds = () => {
  return db.redeemed.findMany()
}

export const redeemed = ({ id }) => {
  return db.redeemed.findUnique({
    where: { id },
  })
}

export const createRedeemed = ({ input }) => {
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

export const redeemedOfStudent = ({ input }) => {
  return db.redeemed.findMany({
    where: {
      userId: input.userId,
      groupId: input.groupId,
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

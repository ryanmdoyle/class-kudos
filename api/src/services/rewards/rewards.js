import { db } from 'src/lib/db'

export const rewards = () => {
  return db.reward.findMany()
}

export const reward = ({ id }) => {
  return db.reward.findUnique({
    where: { id },
  })
}

export const createReward = ({ input }) => {
  return db.reward.create({
    data: input,
  })
}

export const updateReward = ({ id, input }) => {
  return db.reward.update({
    data: input,
    where: { id },
  })
}

export const deleteReward = ({ id }) => {
  return db.reward.delete({
    where: { id },
  })
}

export const Reward = {
  group: (_obj, { root }) => {
    return db.reward.findUnique({ where: { id: root?.id } }).group()
  },
}

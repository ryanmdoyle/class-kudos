import ShortUniqueId from 'short-unique-id'

import { db } from 'src/lib/db'

export const groups = () => {
  return db.group.findMany()
}

export const groupsOwned = ({ ownerId, archived = false }) => {
  return db.group.findMany({
    where: { ownerId: ownerId, archived },
  })
}

export const group = ({ id }) => {
  return db.group.findUnique({
    where: { id },
  })
}

export const findGroupOwnerEmail = async ({ groupId }) => {
  const group = await db.group.findUnique({
    where: { id: groupId },
  })
  const user = await db.user.findUnique({
    where: { id: group.ownerId },
  })
  return { email: user.email }
}

export const createGroup = async ({ input }) => {
  const uid = new ShortUniqueId({ length: 8 })
  return db.group.create({
    data: {
      enrollId: uid(),
      ...input,
    },
  })
}

export const updateGroup = ({ id, input }) => {
  return db.group.update({
    data: input,
    where: { id },
  })
}

export const updateGroupRewarded = ({ groupId, updateValue }) => {
  return db.group.update({
    where: {
      id: groupId,
    },
    data: {
      awardedPoints: {
        increment: updateValue,
      },
    },
  })
}

export const updateGroupName = ({ input }) => {
  const { groupId, name } = input
  return db.group.update({
    where: {
      id: groupId,
    },
    data: {
      name: name,
    },
  })
}

export const deleteGroup = ({ id }) => {
  return db.group.delete({
    where: { id },
  })
}

export const archiveGroup = ({ id }) => {
  return db.group.update({
    where: {
      id: id,
    },
    data: {
      archived: true,
    },
  })
}

export const Group = {
  owner: (_obj, { root }) => {
    return db.group.findUnique({ where: { id: root?.id } }).owner()
  },
  enrollments: (_obj, { root }) => {
    return db.group.findUnique({ where: { id: root?.id } }).enrollments()
  },
  actions: (_obj, { root }) => {
    return db.group.findUnique({ where: { id: root?.id } }).actions()
  },
  feedback: (_obj, { root }) => {
    return db.group.findUnique({ where: { id: root?.id } }).feedback()
  },
}

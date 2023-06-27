import ShortUniqueId from 'short-unique-id'

import { db } from 'src/lib/db'

export const groups = () => {
  return db.group.findMany()
}

export const group = ({ id }) => {
  return db.group.findUnique({
    where: { id },
  })
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

export const deleteGroup = ({ id }) => {
  return db.group.delete({
    where: { id },
  })
}

export const Group = {
  owner: (_obj, { root }) => {
    return db.group.findUnique({ where: { id: root?.id } }).owner()
  },
}

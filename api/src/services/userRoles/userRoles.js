import { db } from 'src/lib/db'

export const userRoles = () => {
  return db.userRole.findMany()
}

export const userRole = ({ id }) => {
  return db.userRole.findUnique({
    where: { id },
  })
}

export const findUserRole = ({ userId }) => {
  return db.userRole.findFirstOrThrow({
    where: { userId: userId },
  })
}

export const createUserRole = ({ input }) => {
  return db.userRole.create({
    data: input,
  })
}

export const updateUserRole = ({ id, input }) => {
  return db.userRole.update({
    data: input,
    where: { id },
  })
}

export const deleteUserRole = ({ id }) => {
  return db.userRole.delete({
    where: { id },
  })
}

export const UserRole = {
  user: (_obj, { root }) => {
    return db.userRole.findUnique({ where: { id: root?.id } }).user()
  },
}

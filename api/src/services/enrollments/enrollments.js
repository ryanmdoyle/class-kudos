import { validate, validateUniqueness } from '@redwoodjs/api'
import { UserInputError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

export const enrollments = () => {
  return db.enrollment.findMany()
}

export const enrollment = ({ id }) => {
  return db.enrollment.findUnique({
    where: { id },
  })
}

export const enolledUsers = ({ id }) => {
  return db.enrollment.findMany({
    where: { groupId: id },
    orderBy: {
      user: { firstName: 'asc' },
    },
  })
}

export const createEnrollment = async ({ input }) => {
  const group = await db.group.findFirst({
    where: {
      enrollId: input.groupEnrollId,
    },
  })
  return db.enrollment.create({
    data: {
      userId: input.userId,
      groupId: group.id,
    },
  })
}

export const createEnrollmentFromEmail = async ({ input }) => {
  const user = await db.user.findFirst({
    where: {
      email: input.email,
    },
  })
  if (user === null) throw new UserInputError('User not found!')

  return validateUniqueness(
    'enrollment',
    { userId: user.id, groupId: input.groupId },
    { message: 'User is already enrolled!' },
    () => {
      return db.enrollment.create({
        data: {
          userId: user.id,
          groupId: input.groupId,
        },
      })
    }
  )
}

export const updateEnrollment = ({ id, input }) => {
  return db.enrollment.update({
    data: input,
    where: { id },
  })
}

export const updateEnrollmentPoints = async ({
  userId,
  groupId,
  updateValue,
}) => {
  const groupEnrollment = await db.enrollment.findFirst({
    where: {
      AND: [
        {
          userId: {
            equals: userId,
          },
        },
        {
          groupId: {
            equals: groupId,
          },
        },
      ],
    },
  })
  return db.enrollment.update({
    where: {
      id: groupEnrollment.id,
    },
    data: {
      points: {
        increment: updateValue,
      },
    },
  })
}

export const deleteEnrollment = ({ id }) => {
  return db.enrollment.delete({
    where: { id },
  })
}

export const enrolledGroup = ({ groupId, userId }) => {
  return db.enrollment.findFirstOrThrow({
    where: {
      userId: userId,
      groupId: groupId,
    },
  })
}

export const enrolledGroups = () => {
  return db.enrollment.findMany({
    where: {
      userId: context.userId,
      group: {
        archived: false,
      },
    },
  })
}

export const findEnrolledGroups = ({ userId }) => {
  return db.enrollment.findMany({
    where: {
      userId: userId,
    },
  })
}

export const Enrollment = {
  user: (_obj, { root }) => {
    return db.enrollment.findUnique({ where: { id: root?.id } }).user()
  },
  group: (_obj, { root }) => {
    return db.enrollment.findUnique({ where: { id: root?.id } }).group()
  },
}

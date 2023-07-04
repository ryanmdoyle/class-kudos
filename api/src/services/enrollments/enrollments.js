import { db } from 'src/lib/db'

export const enrollments = () => {
  return db.enrollment.findMany()
}

export const enrollment = ({ id }) => {
  return db.enrollment.findUnique({
    where: { id },
  })
}

export const enrolledStudents = ({ id }) => {
  return db.enrollment.findMany({
    where: { groupId: id },
  })
}

export const createEnrollment = ({ input }) => {
  return db.enrollment.create({
    data: input,
  })
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

export const enrolledGroup = ({ groupId }) => {
  return db.enrollment.findFirstOrThrow({
    where: {
      userId: context.userId,
      groupId: groupId,
    },
  })
}

export const enrolledGroups = () => {
  return db.enrollment.findMany({
    where: {
      userId: context.userId,
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

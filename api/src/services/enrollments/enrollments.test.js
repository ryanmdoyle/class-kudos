import {
  enrollments,
  enrollment,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from './enrollments'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('enrollments', () => {
  scenario('returns all enrollments', async (scenario) => {
    const result = await enrollments()

    expect(result.length).toEqual(Object.keys(scenario.enrollment).length)
  })

  scenario('returns a single enrollment', async (scenario) => {
    const result = await enrollment({ id: scenario.enrollment.one.id })

    expect(result).toEqual(scenario.enrollment.one)
  })

  scenario('creates a enrollment', async (scenario) => {
    const result = await createEnrollment({
      input: {
        userId: scenario.enrollment.two.userId,
        groupId: scenario.enrollment.two.groupId,
      },
    })

    expect(result.userId).toEqual(scenario.enrollment.two.userId)
    expect(result.groupId).toEqual(scenario.enrollment.two.groupId)
  })

  scenario('updates a enrollment', async (scenario) => {
    const original = await enrollment({
      id: scenario.enrollment.one.id,
    })
    const result = await updateEnrollment({
      id: original.id,
      input: { userId: scenario.enrollment.two.userId },
    })

    expect(result.userId).toEqual(scenario.enrollment.two.userId)
  })

  scenario('deletes a enrollment', async (scenario) => {
    const original = await deleteEnrollment({
      id: scenario.enrollment.one.id,
    })
    const result = await enrollment({ id: original.id })

    expect(result).toEqual(null)
  })
})

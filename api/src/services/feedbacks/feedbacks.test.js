import {
  feedbacks,
  feedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from './feedbacks'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('feedbacks', () => {
  scenario('returns all feedbacks', async (scenario) => {
    const result = await feedbacks()

    expect(result.length).toEqual(Object.keys(scenario.feedback).length)
  })

  scenario('returns a single feedback', async (scenario) => {
    const result = await feedback({ id: scenario.feedback.one.id })

    expect(result).toEqual(scenario.feedback.one)
  })

  scenario('creates a feedback', async (scenario) => {
    const result = await createFeedback({
      input: { userId: scenario.feedback.two.userId },
    })

    expect(result.userId).toEqual(scenario.feedback.two.userId)
  })

  scenario('updates a feedback', async (scenario) => {
    const original = await feedback({
      id: scenario.feedback.one.id,
    })
    const result = await updateFeedback({
      id: original.id,
      input: { userId: scenario.feedback.two.userId },
    })

    expect(result.userId).toEqual(scenario.feedback.two.userId)
  })

  scenario('deletes a feedback', async (scenario) => {
    const original = await deleteFeedback({
      id: scenario.feedback.one.id,
    })
    const result = await feedback({ id: original.id })

    expect(result).toEqual(null)
  })
})

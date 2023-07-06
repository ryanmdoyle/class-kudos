import {
  redeemeds,
  redeemed,
  createRedeemed,
  updateRedeemed,
  deleteRedeemed,
} from './redeemeds'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('redeemeds', () => {
  scenario('returns all redeemeds', async (scenario) => {
    const result = await redeemeds()

    expect(result.length).toEqual(Object.keys(scenario.redeemed).length)
  })

  scenario('returns a single redeemed', async (scenario) => {
    const result = await redeemed({ id: scenario.redeemed.one.id })

    expect(result).toEqual(scenario.redeemed.one)
  })

  scenario('creates a redeemed', async (scenario) => {
    const result = await createRedeemed({
      input: {
        userId: scenario.redeemed.two.userId,
        name: 'String',
        cost: 493537,
        groupId: scenario.redeemed.two.groupId,
      },
    })

    expect(result.userId).toEqual(scenario.redeemed.two.userId)
    expect(result.name).toEqual('String')
    expect(result.cost).toEqual(493537)
    expect(result.groupId).toEqual(scenario.redeemed.two.groupId)
  })

  scenario('updates a redeemed', async (scenario) => {
    const original = await redeemed({
      id: scenario.redeemed.one.id,
    })
    const result = await updateRedeemed({
      id: original.id,
      input: { name: 'String2' },
    })

    expect(result.name).toEqual('String2')
  })

  scenario('deletes a redeemed', async (scenario) => {
    const original = await deleteRedeemed({
      id: scenario.redeemed.one.id,
    })
    const result = await redeemed({ id: original.id })

    expect(result).toEqual(null)
  })
})

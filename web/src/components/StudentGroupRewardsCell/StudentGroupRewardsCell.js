export const QUERY = gql`
  query StudentGroupRewardsQuery($groupId: String!) {
    rewardsOfGroup(id: $groupId) {
      id
      name
      cost
    }
    enrolledGroup(groupId: $groupId) {
      points
    }
  }
`

export const Loading = () => (
  <div className="nes-container with-title col-span-1">
    <p className="title relative bg-white">Recent Feedback</p>
    <p>Loading...</p>
  </div>
)

export const Empty = () => (
  <div className="nes-container with-title col-span-1">
    <p className="title relative bg-white">Recent Feedback</p>
    <p>No feedback yet!</p>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ rewardsOfGroup, enrolledGroup }) => {
  console.log(rewardsOfGroup, enrolledGroup)
  const balance = enrolledGroup.points
  return (
    <div className="nes-container with-title col-span-1">
      <p className="title relative bg-white">Rewards</p>
      <div className="flex flex-wrap justify-around gap-2 max-h-full overflow-y-scroll">
        {rewardsOfGroup.map((reward) => {
          const handleClick = () => {
            window.confirm(`You'd like to buy ${reward.name}?`)
            // create Redeemed here ////////////////
            {
              /* createFeedback({
              variables: {
                input: {
                  name: action.name,
                  value: parseInt(action.value),
                  userId: studentId,
                  groupId: id,
                },
              },
            }) */
            }
          }

          if (balance >= reward.cost) {
            return (
              <button
                key={reward.id}
                className="nes-btn text-xs"
                onClick={handleClick}
              >
                <span className="inline-block mr-3 nes-text is-success">
                  {reward.name}
                </span>
                <span className="inline-block nes-text is-success">
                  {reward.cost}
                </span>
              </button>
            )
          } else {
            return (
              <button
                key={reward.id}
                className="nes-btn text-xs is-disabled"
                // onClick={handleClick}
              >
                <span className="inline-block mr-3 is-disabled">
                  {reward.name}
                </span>
                <span className="inline-block is-disabled">{reward.cost}</span>
              </button>
            )
          }
        })}
      </div>
    </div>
  )
}

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
  <div className="nes-container with-title h-1/2">
    <p className="title relative bg-white">Recent Feedback</p>
  </div>
)

export const Empty = () => (
  <div className="nes-container with-title h-1/2">
    <p className="title relative bg-white">Recent Feedback</p>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ rewardsOfGroup, enrolledGroup }) => {
  console.log(rewardsOfGroup, enrolledGroup)
  return (
    <div className="nes-container with-title w-full">
      <p className="title relative bg-white">Recent Feedback</p>
    </div>
  )
}

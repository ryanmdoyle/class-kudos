import StudentGroupRecentRedeemedList from 'src/components/StudentGroupRecentRedeemedList/StudentGroupRecentRedeemedList'

export const QUERY = gql`
  query FindStudentGroupRecentRedeemedQuery($input: RedeemedOfStudentInput!) {
    redeemedOfStudent: redeemedOfStudent(input: $input) {
      id
      name
      cost
      createdAt
      reviewedAt
    }
  }
`

export const Loading = () => (
  <div className="nes-container with-title col-span-2">
    <p className="title relative bg-white">Redeemed Rewards</p>
    <p>Loading...</p>
  </div>
)

export const Empty = () => (
  <div className="nes-container with-title col-span-2">
    <p className="title relative bg-white">Redeemed Rewards</p>
    <p>No feedback yet!</p>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ redeemedOfStudent }) => {
  return (
    <div className="nes-container with-title w-full col-span-2">
      <p className="title relative bg-white">Redeemed Rewards</p>
      {/* <div className="flex flex-wrap justify-around gap-2 max-h-full overflow-y-scroll"> */}
      <StudentGroupRecentRedeemedList redeemed={redeemedOfStudent} />
      {/* </div> */}
    </div>
  )
}

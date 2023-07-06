import TeacherGroupStoreApprovedList from 'src/components/TeacherGroupStoreApprovedList/TeacherGroupStoreApprovedList'

export const QUERY = gql`
  query FindTeacherGroupStoreApprovedQuery($groupId: String!) {
    redeemedOfGroupApproved: redeemedOfGroupApproved(groupId: $groupId) {
      id
      name
      cost
      reviewedAt
      user {
        firstName
        lastName
      }
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ redeemedOfGroupApproved }) => {
  return (
    <div className="h-full w-full overflow-y-scroll">
      <TeacherGroupStoreApprovedList redeemeds={redeemedOfGroupApproved} />
    </div>
  )
}

import TeacherGroupStoreRequestedList from 'src/components/TeacherGroupStoreRequestedList/TeacherGroupStoreRequestedList'

export const QUERY = gql`
  query FindTeacherGroupStoreRequestedQuery($groupId: String!) {
    redeemedOfGroupRequested: redeemedOfGroupRequested(groupId: $groupId) {
      id
      name
      cost
      createdAt
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

export const Success = ({ redeemedOfGroupRequested }) => {
  return (
    <div className="h-full w-full overflow-y-scroll">
      <TeacherGroupStoreRequestedList redeemeds={redeemedOfGroupRequested} />
    </div>
  )
}

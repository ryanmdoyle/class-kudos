export const QUERY = gql`
  query FindStudentGroupHeaderQuery($groupId: String!, $userId: String!) {
    enrolledGroup: enrolledGroup(groupId: $groupId, userId: $userId) {
      id
      group {
        name
      }
      points
    }
  }
`

export const Loading = () => (
  <div className="nes-container mb-4 flex justify-between">
    <div className="flex flex-col">
      <span className="text-2xl">Loading...</span>
      <span className="nes-text text-xs text-gray-400 hover:text-gray-800">
        Enroll ID:
      </span>
    </div>
    <div className="flex">
      <i className="nes-icon coin is-medium"></i>
      <div className="ml-4 flex flex-col">
        <span className="text-3xl">...</span>
        <span className="text-xs">
          <i>total kudos</i>
        </span>
      </div>
    </div>
  </div>
)

export const Empty = () => (
  <div className="nes-container mb-4 flex justify-between">
    <div className="flex flex-col">
      <span className="text-2xl">-</span>
      <span className="nes-text text-xs text-gray-400 hover:text-gray-800">
        Enroll ID: -
      </span>
    </div>
    <div className="flex">
      <i className="nes-icon coin is-medium"></i>
      <div className="ml-4 flex flex-col">
        <span className="text-3xl">0</span>
        <span className="text-xs">
          <i>total kudos</i>
        </span>
      </div>
    </div>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enrolledGroup }) => {
  return (
    <div className="nes-container mb-4 flex justify-between">
      <div className="flex flex-col">
        <span className="text-2xl">{enrolledGroup.group.name}</span>
      </div>
      <div className="flex">
        <i className="nes-icon coin is-medium"></i>
        <div className="ml-4 flex flex-col">
          <span className="text-3xl">{enrolledGroup.points}</span>
          <span className="text-xs">
            <i>total kudos</i>
          </span>
        </div>
      </div>
    </div>
  )
}

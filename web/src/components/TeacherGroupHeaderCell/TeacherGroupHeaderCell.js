export const QUERY = gql`
  query TeacherGroupHeaderQuery($id: String!) {
    TeacherGroupHeader: group(id: $id) {
      id
      name
      description
      enrollId
      awardedPoints
      enrollments {
        id
      }
    }
  }
`

export const Loading = () => (
  <div className="nes-container flex justify-between mb-8">
    <div className="flex flex-col">
      <span className="text-2xl">Loading Group...</span>
      <span className="text-xs nes-text text-gray-400 hover:text-gray-800">
        Enroll ID: loading...
      </span>
    </div>
    <div className="flex">
      <i className="nes-icon coin is-medium"></i>
      <div className="flex flex-col ml-4">
        <span className="text-3xl">...</span>
        <span className="text-xs">
          <i>total kudos</i>
        </span>
      </div>
    </div>
  </div>
)

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ TeacherGroupHeader }) => {
  return (
    <div className="nes-container flex justify-between mb-8">
      <div className="flex flex-col">
        <span className="text-2xl">{TeacherGroupHeader.name}</span>
        <span className="text-xs nes-text text-gray-400 hover:text-gray-800">
          Enroll ID: {TeacherGroupHeader.enrollId}
        </span>
      </div>
      <div className="flex">
        <i className="nes-icon coin is-medium"></i>
        <div className="flex flex-col ml-4">
          <span className="text-3xl">{TeacherGroupHeader.awardedPoints}</span>
          <span className="text-xs">
            <i>total kudos</i>
          </span>
        </div>
      </div>
    </div>
  )
}

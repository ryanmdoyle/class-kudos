export const QUERY = gql`
  query EnrolledStudentsQuery($id: String!) {
    enrolledStudents(id: $id) {
      id
      points
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

export const Success = ({ enrolledStudents }) => {
  return (
    <ul className="w-1/3 h-[60%] nes-container with-title pb-3 px-4">
      <span className="nes-text title relative -top-2">Students</span>
      <div className="overflow-y-scroll">
        {enrolledStudents.map((enrollment) => {
          return (
            <li key={enrollment.id} className="flex justify-between mb-3">
              <p className="inline-block">{enrollment.user.firstName}</p>
              <p className="inline-block mr-2">20</p>
            </li>
          )
        })}
      </div>
    </ul>
  )
}

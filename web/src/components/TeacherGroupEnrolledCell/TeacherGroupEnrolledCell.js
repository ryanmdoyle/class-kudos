import { Link, routes } from '@redwoodjs/router'

export const QUERY = gql`
  query EnrolledStudentsQuery($id: String!) {
    enrolledStudents(id: $id) {
      id
      points
      groupId
      userId
      user {
        firstName
        lastName
      }
    }
  }
`

export const Loading = () => (
  <ul className="w-1/3 h-[60%] nes-container with-title pb-3 px-4">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="flex justify-between mb-3">
        <p className="inline-block">Loading...</p>
      </li>
    </div>
  </ul>
)

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enrolledStudents }) => {
  return (
    <ul className="nes-container with-title h-full pb-3 px-4">
      <span className="nes-text title relative -top-2">Students</span>
      <div className="overflow-y-scroll">
        {enrolledStudents.map((enrollment) => {
          return (
            <Link
              key={enrollment.id}
              to={routes.teacherGroupStudent({
                id: enrollment.groupId,
                studentId: enrollment.userId,
              })}
            >
              <li className="flex justify-between mb-3">
                <p className="inline-block">{enrollment.user.firstName}</p>
                <p className="inline-block mr-2">{enrollment.points}</p>
              </li>
            </Link>
          )
        })}
      </div>
    </ul>
  )
}

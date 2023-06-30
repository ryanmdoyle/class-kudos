import { NavLink, routes } from '@redwoodjs/router'

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
  <ul className="nes-container with-title h-full pb-3 px-4">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="flex justify-between mb-3">
        <p className="inline-block">Loading...</p>
      </li>
    </div>
  </ul>
)

export const Empty = () => (
  <ul className="nes-container with-title h-full pb-3 px-4">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="flex justify-between mb-3">
        <p className="inline-block">Get started by enrolling students.</p>
      </li>
    </div>
  </ul>
)

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
            <NavLink
              className="nes-text"
              activeClassName="nes-text is-primary"
              key={enrollment.id}
              to={routes.teacherGroupStudent({
                id: enrollment.groupId,
                studentId: enrollment.userId,
              })}
            >
              <li className="flex justify-between mb-3">
                <p className="inline-block">
                  {enrollment.user.firstName} {enrollment.user.lastName}
                  {/* {enrollment.user.lastName.slice(0, 1)}. */}
                </p>
                <p className="inline-block mr-2">{enrollment.points}</p>
              </li>
            </NavLink>
          )
        })}
      </div>
    </ul>
  )
}

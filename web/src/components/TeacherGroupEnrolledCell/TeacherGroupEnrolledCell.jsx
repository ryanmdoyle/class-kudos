import { NavLink, routes } from '@redwoodjs/router'

export const QUERY = gql`
  query EnolledUsersQuery($id: String!) {
    enrolledUsers(id: $id) {
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
  <ul className="nes-container with-title h-full px-4 pb-3">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="mb-3 flex justify-between">
        <p className="inline-block">Loading...</p>
      </li>
    </div>
  </ul>
)

export const Empty = () => (
  <ul className="nes-container with-title h-full px-4 pb-3">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="mb-3 flex justify-between">
        <p className="inline-block">Get started by enrolling students.</p>
      </li>
    </div>
  </ul>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enrolledUsers }) => {
  return (
    <ul className="nes-container with-title h-full px-4 pb-3 pr-0">
      <span className="nes-text title relative -top-2">Students</span>
      <div className="h-full overflow-y-scroll pr-1">
        {enrolledUsers.map((enrollment) => {
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
              <li className="mb-3 flex justify-between">
                <p className="inline-block">
                  {enrollment.user.firstName} {enrollment.user.lastName}
                  {/* {enrollment.user.lastName.slice(0, 1)}. */}
                </p>
                <p className="mr-2 inline-block">{enrollment.points}</p>
              </li>
            </NavLink>
          )
        })}
      </div>
    </ul>
  )
}

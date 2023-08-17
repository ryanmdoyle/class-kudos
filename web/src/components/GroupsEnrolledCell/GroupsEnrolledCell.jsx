import { Link, routes } from '@redwoodjs/router'

export const QUERY = gql`
  query FindGroupsEnrolledQuery($userId: String!) {
    enrolledGroups: findEnrolledGroups(userId: $userId) {
      id
      group {
        name
      }
      groupId
      points
    }
  }
`

export const Loading = () => <div>Loading Groups...</div>

export const Empty = () => (
  <div className="mb-4">
    You have enrolled in any groups. Enroll in a group to get started!
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enrolledGroups }) => {
  return (
    <>
      <div className="mb-4 text-sm">
        <p>
          Select a group to get started, or enroll in a new group using the
          button below!
        </p>
      </div>
      <ul className="nes-list is-disc mb-4 pl-4">
        {enrolledGroups.map((enrollment) => (
          <li className="mb-2" key={enrollment.id}>
            <Link to={routes.studentGroup({ id: enrollment.groupId })}>
              {enrollment.group.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

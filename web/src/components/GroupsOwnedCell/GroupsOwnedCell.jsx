import { Link, routes } from '@redwoodjs/router'

export const QUERY = gql`
  query FindGroupsOwnedQuery($ownerId: String!) {
    groupsOwned: groupsOwned(ownerId: $ownerId) {
      id
      name
    }
  }
`

export const Loading = () => <div>Loading Groups...</div>

export const Empty = () => (
  <div className="mb-4">
    You have no groups created. Add a group to get started.
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ groupsOwned }) => {
  return (
    <>
      <div className="mb-4 text-sm">
        <p>Chose a group to start awarding kudos!</p>
      </div>
      <ul className="nes-list is-disc mb-4 pl-4">
        {groupsOwned.map((group) => (
          <li className="mb-2" key={group.id}>
            <Link to={routes.teacherGroup({ id: group.id })}>{group.name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}

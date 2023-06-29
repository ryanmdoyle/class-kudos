export const QUERY = gql`
  query GroupActionsQuery($id: String!) {
    actionsOfGroup(id: $id) {
      id
      name
      value
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ actionsOfGroup }) => {
  return (
    <ul>
      {actionsOfGroup.map((group) => (
        <li key={group.id}>
          {group.name} {group.value}
        </li>
      ))}
    </ul>
  )
}

import Action from 'src/components/Action/Action'

export const QUERY = gql`
  query FindActionById($id: String!) {
    action: action(id: $id) {
      id
      name
      value
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Action not found</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ action }) => {
  return <Action action={action} />
}

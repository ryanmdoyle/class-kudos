import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { DELETE_ACTION_MUTATION } from 'src/components/Action/Actions'
import { truncate } from 'src/lib/formatters'

export const QUERY = gql`
  query GroupActionsQuery($id: String!) {
    actionsOfGroup(id: $id) {
      id
      name
      value
    }
  }
`

// const DELETE_ACTION_MUTATION = gql`
//   mutation DeleteActionMutation($id: String!) {
//     deleteAction(id: $id) {
//       id
//     }
//   }
// `

export const Loading = () => <div>Loading...</div>

export const Empty = () => (
  <div className="rw-text-center">
    {'No actions yet. '}
    <Link to={routes.newAction()} className="rw-link">
      {'Create one?'}
    </Link>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ actionsOfGroup }) => {
  const [deleteAction] = useMutation(DELETE_ACTION_MUTATION, {
    onCompleted: () => {
      toast.success('Action deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    refetchQueries: [{ query: QUERY }],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete action ' + id + '?')) {
      deleteAction({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible">
      <span className="nes-text title relative -top-2">Group Actions</span>
      <table className="rw-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th className="flex w-full flex-row-reverse">
              <Link
                to={routes.newAction()}
                className="rw-button rw-button-green nes-button w-[200px]"
              >
                <div className="rw-button-icon">+</div> Add Action
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {actionsOfGroup.map((action) => (
            <tr key={action.id}>
              <td>{truncate(action.name)}</td>
              <td>{truncate(action.value)}</td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.action({ id: action.id })}
                    title={'Show action ' + action.id + ' detail'}
                    className="ml-3 rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editAction({ id: action.id })}
                    title={'Edit action ' + action.id}
                    className="ml-3 rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={'Delete action ' + action.id}
                    className="ml-3 rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(action.id)}
                  >
                    Delete
                  </button>
                </nav>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

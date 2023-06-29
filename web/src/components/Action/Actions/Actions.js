import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY } from 'src/components/Action/ActionsCell'
import { truncate } from 'src/lib/formatters'

export const DELETE_ACTION_MUTATION = gql`
  mutation DeleteActionMutation($id: String!) {
    deleteAction(id: $id) {
      id
    }
  }
`

const ActionsList = ({ actions }) => {
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
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Value</th>
            <th>Group id</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>{truncate(action.id)}</td>
              <td>{truncate(action.name)}</td>
              <td>{truncate(action.value)}</td>
              <td>{truncate(action.groupId)}</td>
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

export default ActionsList

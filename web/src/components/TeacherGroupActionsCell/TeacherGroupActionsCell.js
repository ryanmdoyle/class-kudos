import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

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

const DELETE_ACTION_MUTATION = gql`
  mutation DeleteActionMutation($id: String!) {
    deleteAction(id: $id) {
      id
    }
  }
`

export const Loading = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible mb-4">
    <span className="nes-text title relative -top-2">Group Actions</span>
    <table className="rw-table text-xs">
      <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewAction({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Action
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="flex justify-around pt-4">Loading actions...</tr>
      </tbody>
    </table>
  </div>
)

export const Empty = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible mb-4">
    <span className="nes-text title relative -top-2">Group Actions</span>
    <table className="rw-table text-xs">
      <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewAction({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Action
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="flex justify-around pt-4">
          No acttons created yet, add some to get started!
        </tr>
      </tbody>
    </table>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ id, actionsOfGroup }) => {
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
    refetchQueries: [{ query: QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete action?')) {
      deleteAction({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible mb-4">
      <span className="nes-text title relative -top-2">Group Actions</span>
      <table className="rw-table text-xs">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th className="flex w-full flex-row-reverse">
              <Link
                to={routes.teacherGroupNewAction({ id })}
                className="rw-button rw-button-green nes-button w-[200px]"
              >
                Add Action
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

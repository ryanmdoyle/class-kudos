import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY } from 'src/components/Group/GroupsCell'
import { checkboxInputTag, truncate } from 'src/lib/formatters'

const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroupMutation($id: String!) {
    deleteGroup(id: $id) {
      id
    }
  }
`

const GroupsList = ({ groups }) => {
  const [deleteGroup] = useMutation(DELETE_GROUP_MUTATION, {
    onCompleted: () => {
      toast.success('Group deleted')
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
    if (confirm('Are you sure you want to delete group ' + id + '?')) {
      deleteGroup({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Description</th>
            <th>Enroll id</th>
            <th>Awarded points</th>
            <th>Owner id</th>
            <th>Archived</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td>{truncate(group.id)}</td>
              <td>{truncate(group.name)}</td>
              <td>{truncate(group.description)}</td>
              <td>{truncate(group.enrollId)}</td>
              <td>{truncate(group.awardedPoints)}</td>
              <td>{truncate(group.ownerId)}</td>
              <td>{checkboxInputTag(group.archived)}</td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.group({ id: group.id })}
                    title={'Show group ' + group.id + ' detail'}
                    className="rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editGroup({ id: group.id })}
                    title={'Edit group ' + group.id}
                    className="rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={'Delete group ' + group.id}
                    className="rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(group.id)}
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

export default GroupsList

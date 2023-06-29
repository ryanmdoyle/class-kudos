import { Link, routes, navigate } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { checkboxInputTag } from 'src/lib/formatters'

const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroupMutation($id: String!) {
    deleteGroup(id: $id) {
      id
    }
  }
`

const Group = ({ group }) => {
  const [deleteGroup] = useMutation(DELETE_GROUP_MUTATION, {
    onCompleted: () => {
      toast.success('Group deleted')
      navigate(routes.groups())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete group ' + id + '?')) {
      deleteGroup({ variables: { id } })
    }
  }

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">
            Group {group.id} Detail
          </h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{group.id}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{group.name}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td>{group.description}</td>
            </tr>
            <tr>
              <th>Enroll id</th>
              <td>{group.enrollId}</td>
            </tr>
            <tr>
              <th>Awarded points</th>
              <td>{group.awardedPoints}</td>
            </tr>
            <tr>
              <th>Owner id</th>
              <td>{group.ownerId}</td>
            </tr>
            <tr>
              <th>Archived</th>
              <td>{checkboxInputTag(group.archived)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link
          to={routes.editGroup({ id: group.id })}
          className="rw-button rw-button-blue"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(group.id)}
        >
          Delete
        </button>
      </nav>
    </>
  )
}

export default Group

import { Link, routes, navigate } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { checkboxInputTag, timeTag } from 'src/lib/formatters'

const DELETE_REDEEMED_MUTATION = gql`
  mutation DeleteRedeemedMutation($id: String!) {
    deleteRedeemed(id: $id) {
      id
    }
  }
`

const Redeemed = ({ redeemed }) => {
  const [deleteRedeemed] = useMutation(DELETE_REDEEMED_MUTATION, {
    onCompleted: () => {
      toast.success('Redeemed deleted')
      navigate(routes.redeemeds())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete redeemed ' + id + '?')) {
      deleteRedeemed({ variables: { id } })
    }
  }

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">
            Redeemed {redeemed.id} Detail
          </h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{redeemed.id}</td>
            </tr>
            <tr>
              <th>User id</th>
              <td>{redeemed.userId}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{redeemed.name}</td>
            </tr>
            <tr>
              <th>Cost</th>
              <td>{redeemed.cost}</td>
            </tr>
            <tr>
              <th>Response</th>
              <td>{redeemed.response}</td>
            </tr>
            <tr>
              <th>Reviewed</th>
              <td>{checkboxInputTag(redeemed.reviewed)}</td>
            </tr>
            <tr>
              <th>Reviewed at</th>
              <td>{timeTag(redeemed.reviewedAt)}</td>
            </tr>
            <tr>
              <th>Group id</th>
              <td>{redeemed.groupId}</td>
            </tr>
            <tr>
              <th>Created at</th>
              <td>{timeTag(redeemed.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link
          to={routes.editRedeemed({ id: redeemed.id })}
          className="rw-button rw-button-blue"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(redeemed.id)}
        >
          Delete
        </button>
      </nav>
    </>
  )
}

export default Redeemed

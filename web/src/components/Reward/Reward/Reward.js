import { Link, routes, navigate } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { checkboxInputTag } from 'src/lib/formatters'

const DELETE_REWARD_MUTATION = gql`
  mutation DeleteRewardMutation($id: String!) {
    deleteReward(id: $id) {
      id
    }
  }
`

const Reward = ({ reward }) => {
  const [deleteReward] = useMutation(DELETE_REWARD_MUTATION, {
    onCompleted: () => {
      toast.success('Reward deleted')
      navigate(routes.rewards())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete reward ' + id + '?')) {
      deleteReward({ variables: { id } })
    }
  }

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">
            Reward {reward.id} Detail
          </h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{reward.id}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{reward.name}</td>
            </tr>
            <tr>
              <th>Cost</th>
              <td>{reward.cost}</td>
            </tr>
            <tr>
              <th>Response required</th>
              <td>{checkboxInputTag(reward.responseRequired)}</td>
            </tr>
            <tr>
              <th>Response prompt</th>
              <td>{reward.responsePrompt}</td>
            </tr>
            <tr>
              <th>Group id</th>
              <td>{reward.groupId}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link
          to={routes.editReward({ id: reward.id })}
          className="rw-button rw-button-blue"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(reward.id)}
        >
          Delete
        </button>
      </nav>
    </>
  )
}

export default Reward

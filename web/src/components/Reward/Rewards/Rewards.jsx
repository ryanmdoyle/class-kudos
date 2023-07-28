import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY } from 'src/components/Reward/RewardsCell'
import { checkboxInputTag, truncate } from 'src/lib/formatters'

const DELETE_REWARD_MUTATION = gql`
  mutation DeleteRewardMutation($id: String!) {
    deleteReward(id: $id) {
      id
    }
  }
`

const RewardsList = ({ rewards }) => {
  const [deleteReward] = useMutation(DELETE_REWARD_MUTATION, {
    onCompleted: () => {
      toast.success('Reward deleted')
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
    if (confirm('Are you sure you want to delete reward ' + id + '?')) {
      deleteReward({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Cost</th>
            <th>Response required</th>
            <th>Response prompt</th>
            <th>Group id</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {rewards.map((reward) => (
            <tr key={reward.id}>
              <td>{truncate(reward.id)}</td>
              <td>{truncate(reward.name)}</td>
              <td>{truncate(reward.cost)}</td>
              <td>{checkboxInputTag(reward.responseRequired)}</td>
              <td>{truncate(reward.responsePrompt)}</td>
              <td>{truncate(reward.groupId)}</td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.reward({ id: reward.id })}
                    title={'Show reward ' + reward.id + ' detail'}
                    className="rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editReward({ id: reward.id })}
                    title={'Edit reward ' + reward.id}
                    className="rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={'Delete reward ' + reward.id}
                    className="rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(reward.id)}
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

export default RewardsList

import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { truncate } from 'src/lib/formatters'

export const QUERY = gql`
  query rewardsOfGroup($id: String!) {
    rewardsOfGroup(id: $id) {
      id
      name
      cost
    }
  }
`

const DELETE_REWARD_MUTATION = gql`
  mutation DeleteRewardMutation($id: String!) {
    deleteReward(id: $id) {
      id
    }
  }
`

export const Loading = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible">
    <span className="nes-text title relative -top-2">Group Rewards</span>
    <table className="rw-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Cost</th>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewReward({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Reward
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="flex justify-around pt-4">Loading rewards...</tr>
      </tbody>
    </table>
  </div>
)

export const Empty = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible">
    <span className="nes-text title relative -top-2">Group Rewards</span>
    <table className="rw-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Cost</th>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewReward({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Reward
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="flex justify-around pt-4">
          No rewards created yet, add some to get started!
        </tr>
      </tbody>
    </table>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ id, rewardsOfGroup }) => {
  const [deleteAction] = useMutation(DELETE_REWARD_MUTATION, {
    onCompleted: () => {
      toast.success('Reward deleted')
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
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative overflow-visible">
      <span className="nes-text title relative -top-2">Group Rewards</span>
      <table className="rw-table text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Cost</th>
            <th className="flex w-full flex-row-reverse">
              <Link
                to={routes.teacherGroupNewReward({ id })}
                className="rw-button rw-button-green nes-button w-[200px]"
              >
                Add Reward
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {rewardsOfGroup.map((reward) => (
            <tr key={reward.id}>
              <td>{truncate(reward.name)}</td>
              <td>{truncate(reward.cost)}</td>
              <td>
                <nav className="rw-table-actions">
                  <button
                    type="button"
                    title={'Delete reward ' + reward.id}
                    className="ml-3 rw-button rw-button-small rw-button-red"
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
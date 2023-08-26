import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as STUDENT_GROUP_HEADER_QUERY } from 'src/components/StudentGroupHeaderCell/StudentGroupHeaderCell'
import { QUERY as STUDENT_GROUP_RECENT_REDEEMED_QUERY } from 'src/components/StudentGroupRecentRedeemedCell/StudentGroupRecentRedeemedCell'

export const QUERY = gql`
  query StudentGroupRewardsQuery($groupId: String!, $userId: String!) {
    rewardsOfGroup(id: $groupId) {
      id
      name
      cost
    }
    enrolledGroup(groupId: $groupId, userId: $userId) {
      points
    }
  }
`

export const Loading = () => (
  <div className="nes-container with-title col-span-1">
    <p className="title relative bg-white">Recent Feedback</p>
    <p>Loading...</p>
  </div>
)

export const Empty = () => (
  <div className="nes-container with-title col-span-1">
    <p className="title relative bg-white">Recent Feedback</p>
    <p>No feedback yet!</p>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ rewardsOfGroup, enrolledGroup, userId, groupId }) => {
  const balance = enrolledGroup.points

  const CREATE_REDEEMED_MUTATION = gql`
    mutation CreateRedeemedMutation($input: CreateRedeemedInput!) {
      createRedeemed(input: $input) {
        id
      }
    }
  `

  const [createRedeemed, { loading, error }] = useMutation(
    CREATE_REDEEMED_MUTATION,
    {
      onCompleted: () => {
        toast.success('Reward Requested')
      },
      onError: (error) => {
        toast.error(error.message)
      },
      refetchQueries: [
        {
          query: STUDENT_GROUP_RECENT_REDEEMED_QUERY,
          variables: { input: { userId, groupId } },
        },
        {
          query: STUDENT_GROUP_HEADER_QUERY,
          variables: { groupId, userId },
        },
      ],
      awaitRefetchQueries: true,
    }
  )

  return (
    <div className="nes-container with-title col-span-1">
      <p className="title relative bg-white">Rewards</p>
      <div className="flex max-h-full flex-wrap justify-around gap-2 overflow-y-scroll">
        {rewardsOfGroup.map((reward) => {
          const handleClick = () => {
            if (window.confirm(`You'd like to buy ${reward.name}?`)) {
              createRedeemed({
                variables: {
                  input: {
                    name: reward.name,
                    cost: parseInt(reward.cost),
                    userId: userId,
                    groupId: groupId,
                    reviewed: false,
                  },
                },
              })
            }
          }

          if (balance >= reward.cost) {
            return (
              <button
                key={reward.id}
                className="nes-btn text-xs"
                onClick={handleClick}
              >
                <span className="nes-text is-success mr-3 inline-block">
                  {reward.name}
                </span>
                <span className="nes-text is-success inline-block">
                  {reward.cost}
                </span>
              </button>
            )
          } else {
            return (
              <button
                key={reward.id}
                className="nes-btn is-disabled text-xs"
                // onClick={handleClick}
              >
                <span className="is-disabled mr-3 inline-block">
                  {reward.name}
                </span>
                <span className="is-disabled inline-block">{reward.cost}</span>
              </button>
            )
          }
        })}
      </div>
    </div>
  )
}

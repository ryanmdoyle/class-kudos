import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as STUDENT_GROUP_HEADER_QUERY } from 'src/components/StudentGroupHeaderCell/StudentGroupHeaderCell'
import { QUERY as STUDENT_GROUP_RECENT_REDEEMED_QUERY } from 'src/components/StudentGroupRecentRedeemedCell/StudentGroupRecentRedeemedCell'

export const QUERY = gql`
  query StudentGroupRewardsQuery($groupId: String!) {
    rewardsOfGroup(id: $groupId) {
      id
      name
      cost
    }
    enrolledGroup(groupId: $groupId) {
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
          variables: { groupId },
        },
      ],
      awaitRefetchQueries: true,
    }
  )

  return (
    <div className="nes-container with-title col-span-1">
      <p className="title relative bg-white">Rewards</p>
      <div className="flex flex-wrap justify-around gap-2 max-h-full overflow-y-scroll">
        {rewardsOfGroup.map((reward) => {
          const handleClick = () => {
            window.confirm(`You'd like to buy ${reward.name}?`)
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

          if (balance >= reward.cost) {
            return (
              <button
                key={reward.id}
                className="nes-btn text-xs"
                onClick={handleClick}
              >
                <span className="inline-block mr-3 nes-text is-success">
                  {reward.name}
                </span>
                <span className="inline-block nes-text is-success">
                  {reward.cost}
                </span>
              </button>
            )
          } else {
            return (
              <button
                key={reward.id}
                className="nes-btn text-xs is-disabled"
                // onClick={handleClick}
              >
                <span className="inline-block mr-3 is-disabled">
                  {reward.name}
                </span>
                <span className="inline-block is-disabled">{reward.cost}</span>
              </button>
            )
          }
        })}
      </div>
    </div>
  )
}

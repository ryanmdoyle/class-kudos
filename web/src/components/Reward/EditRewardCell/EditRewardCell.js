import { navigate, routes } from '@redwoodjs/router'

import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import RewardForm from 'src/components/Reward/RewardForm'

export const QUERY = gql`
  query EditRewardById($id: String!) {
    reward: reward(id: $id) {
      id
      name
      cost
      responseRequired
      responsePrompt
      groupId
    }
  }
`
const UPDATE_REWARD_MUTATION = gql`
  mutation UpdateRewardMutation($id: String!, $input: UpdateRewardInput!) {
    updateReward(id: $id, input: $input) {
      id
      name
      cost
      responseRequired
      responsePrompt
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ reward }) => {
  const [updateReward, { loading, error }] = useMutation(
    UPDATE_REWARD_MUTATION,
    {
      onCompleted: () => {
        toast.success('Reward updated')
        navigate(routes.rewards())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input, id) => {
    updateReward({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit Reward {reward?.id}
        </h2>
      </header>
      <div className="rw-segment-main">
        <RewardForm
          reward={reward}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

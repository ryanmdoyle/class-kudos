import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import RewardForm from 'src/components/Reward/RewardForm'

const CREATE_REWARD_MUTATION = gql`
  mutation CreateRewardMutation($input: CreateRewardInput!) {
    createReward(input: $input) {
      id
    }
  }
`

const NewReward = () => {
  const [createReward, { loading, error }] = useMutation(
    CREATE_REWARD_MUTATION,
    {
      onCompleted: () => {
        toast.success('Reward created')
        navigate(routes.rewards())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    createReward({ variables: { input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Reward</h2>
      </header>
      <div className="rw-segment-main">
        <RewardForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  )
}

export default NewReward

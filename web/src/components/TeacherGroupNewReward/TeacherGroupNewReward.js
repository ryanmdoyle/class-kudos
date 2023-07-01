import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import TeacherGroupRewardForm from 'src/components/TeacherGroupRewardForm/TeacherGroupRewardForm'

const CREATE_REWARD_MUTATION = gql`
  mutation CreateRewardMutation($input: CreateRewardInput!) {
    createReward(input: $input) {
      id
    }
  }
`

const TeacherGroupNewReward = ({ groupId }) => {
  const [createReward, { loading, error }] = useMutation(
    CREATE_REWARD_MUTATION,
    {
      onCompleted: () => {
        navigate(routes.teacherGroupOptions({ id: groupId }))
        toast.success('Reward created')
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
        <TeacherGroupRewardForm
          onSave={onSave}
          loading={loading}
          error={error}
          groupId={groupId}
        />
      </div>
    </div>
  )
}

export default TeacherGroupNewReward

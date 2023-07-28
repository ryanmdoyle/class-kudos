import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import TeacherGroupActionForm from 'src/components/TeacherGroupActionForm/TeacherGroupActionForm'

const CREATE_ACTION_MUTATION = gql`
  mutation CreateActionMutation($input: CreateActionInput!) {
    createAction(input: $input) {
      id
    }
  }
`

const TeacherGroupNewAction = ({ groupId }) => {
  const [createAction, { loading, error }] = useMutation(
    CREATE_ACTION_MUTATION,
    {
      onCompleted: () => {
        navigate(routes.teacherGroupOptions({ id: groupId }))
        toast.success('Action created')
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    createAction({ variables: { input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Action</h2>
      </header>
      <div className="rw-segment-main">
        <TeacherGroupActionForm
          onSave={onSave}
          loading={loading}
          error={error}
          groupId={groupId}
        />
      </div>
    </div>
  )
}

export default TeacherGroupNewAction

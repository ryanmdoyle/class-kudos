import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import ActionForm from 'src/components/Action/ActionForm'

const CREATE_ACTION_MUTATION = gql`
  mutation CreateActionMutation($input: CreateActionInput!) {
    createAction(input: $input) {
      id
    }
  }
`

const NewAction = () => {
  const [createAction, { loading, error }] = useMutation(
    CREATE_ACTION_MUTATION,
    {
      onCompleted: () => {
        toast.success('Action created')
        navigate(routes.actions())
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
        <ActionForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  )
}

export default NewAction

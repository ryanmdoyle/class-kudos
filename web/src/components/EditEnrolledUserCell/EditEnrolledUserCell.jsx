import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import UserForm from 'src/components/User/UserForm'

import EditEnrolledUserForm from '../EditEnrolledUserForm/EditEnrolledUserForm'

export const QUERY = gql`
  query EditUserById($id: String!) {
    user: user(id: $id) {
      id
      email
      firstName
      lastName
    }
  }
`
const UPDATE_USER_MUTATION = gql`
  mutation UpdateUserMutation($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ user, groupId }) => {
  const [updateUser, { loading, error }] = useMutation(UPDATE_USER_MUTATION, {
    onCompleted: () => {
      toast.success(`${user.firstName} updated!`)
      navigate(routes.teacherGroupOptions({ id: groupId }))
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSave = (input, id) => {
    updateUser({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit User {user?.firstName} {user?.lastName}
        </h2>
      </header>
      <div className="rw-segment-main">
        <EditEnrolledUserForm
          user={user}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

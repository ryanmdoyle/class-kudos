import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import TeacherProfileForm from '../TeacherProfileForm/TeacherProfileForm'

export const QUERY = gql`
  query EditTeacherProfileById($id: String!) {
    user: user(id: $id) {
      id
      firstName
      lastName
    }
  }
`

const UPDATE_USER_MUTATION = gql`
  mutation UpdateTeacherProfileMutation(
    $id: String!
    $input: UpdateUserInput!
  ) {
    updateUser(id: $id, input: $input) {
      id
      firstName
      lastName
      email
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ user }) => {
  const [updateTeacher, { loading, error }] = useMutation(
    UPDATE_USER_MUTATION,
    {
      onCompleted: () => {
        toast.success('Updated!')
        navigate(routes.teacher())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input, id) => {
    updateTeacher({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit User: {user.firstName} {user.lastName}
        </h2>
      </header>
      <div className="rw-segment-main">
        <TeacherProfileForm
          user={user}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

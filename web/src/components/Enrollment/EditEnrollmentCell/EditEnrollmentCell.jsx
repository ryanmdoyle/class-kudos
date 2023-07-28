import { navigate, routes } from '@redwoodjs/router'

import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import EnrollmentForm from 'src/components/Enrollment/EnrollmentForm'

export const QUERY = gql`
  query EditEnrollmentById($id: String!) {
    enrollment: enrollment(id: $id) {
      id
      userId
      groupId
      points
    }
  }
`
const UPDATE_ENROLLMENT_MUTATION = gql`
  mutation UpdateEnrollmentMutation(
    $id: String!
    $input: UpdateEnrollmentInput!
  ) {
    updateEnrollment(id: $id, input: $input) {
      id
      userId
      groupId
      points
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ enrollment }) => {
  const [updateEnrollment, { loading, error }] = useMutation(
    UPDATE_ENROLLMENT_MUTATION,
    {
      onCompleted: () => {
        toast.success('Enrollment updated')
        navigate(routes.enrollments())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input, id) => {
    updateEnrollment({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit Enrollment {enrollment?.id}
        </h2>
      </header>
      <div className="rw-segment-main">
        <EnrollmentForm
          enrollment={enrollment}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

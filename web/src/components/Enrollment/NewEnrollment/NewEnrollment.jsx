import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import EnrollmentForm from 'src/components/Enrollment/EnrollmentForm'

const CREATE_ENROLLMENT_MUTATION = gql`
  mutation CreateEnrollmentMutation($input: CreateEnrollmentInput!) {
    createEnrollment(input: $input) {
      id
    }
  }
`

const NewEnrollment = () => {
  const [createEnrollment, { loading, error }] = useMutation(
    CREATE_ENROLLMENT_MUTATION,
    {
      onCompleted: () => {
        toast.success('Enrollment created')
        navigate(routes.enrollments())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    createEnrollment({ variables: { input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Enrollment</h2>
      </header>
      <div className="rw-segment-main">
        <EnrollmentForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  )
}

export default NewEnrollment

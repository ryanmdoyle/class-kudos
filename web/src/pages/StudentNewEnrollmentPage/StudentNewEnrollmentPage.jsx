import { navigate, routes } from '@redwoodjs/router'
import { MetaTags, useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'
import StudentNewEnrollmentForm from 'src/components/StudentNewEnrollmentForm'

const CREATE_STUDENT_ENROLLMENT = gql`
  mutation CreateEnrollmentMutation($input: CreateEnrollmentInput!) {
    createEnrollment(input: $input) {
      id
    }
  }
`

const StudentNewEnrollmentPage = () => {
  const [createEnrollment, { loading, error }] = useMutation(
    CREATE_STUDENT_ENROLLMENT,
    {
      onCompleted: () => {
        navigate(routes.student())
        toast.success('Group created!')
      },
      onError: (error) => {
        navigate(routes.student())
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    input.userId = currentUser?.id
    createEnrollment({ variables: { input } })
  }

  const { currentUser } = useAuth()

  return (
    <>
      <MetaTags title="New Enrollment" description="New Enrollment page" />
      <div className="max-w-m nes-text container block py-4  text-sm">
        Enter the enrollment code from your instructor to add the group!
      </div>
      <StudentNewEnrollmentForm userId={currentUser?.id} onSave={onSave} />
    </>
  )
}

export default StudentNewEnrollmentPage

import { Link, navigate, routes } from '@redwoodjs/router'
import { MetaTags, useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import TeacherGroupNewEnrollmentForm from 'src/components/TeacherGroupNewEnrollmentForm'

const CREATE_ENROLLMENT_FROM_EMAIL = gql`
  mutation CreateEnrollmentFromEmailMutation(
    $input: CreateEnrollmentFromEmailInput!
  ) {
    createEnrollmentFromEmail(input: $input) {
      id
    }
  }
`

const TeacherGroupNewEnrollmentPage = ({ id }) => {
  const [createEnrollmentFromEmail, { loading, error }] = useMutation(
    CREATE_ENROLLMENT_FROM_EMAIL,
    {
      onCompleted: () => {
        navigate(routes.teacherGroupOptions({ id }))
        toast.success('Student Added!')
      },
      onError: (error) => {
        navigate(routes.student())
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    input.groupId = id
    createEnrollmentFromEmail({ variables: { input } })
  }

  return (
    <>
      <MetaTags
        title="New Enrollment - Class Kudos"
        description="New Enrollment page"
      />
      <div className="max-w-m nes-text container block py-4  text-sm">
        Enter the enrollment code from your instructor to add the group!
      </div>
      <TeacherGroupNewEnrollmentForm onSave={onSave} />
    </>
  )
}

export default TeacherGroupNewEnrollmentPage

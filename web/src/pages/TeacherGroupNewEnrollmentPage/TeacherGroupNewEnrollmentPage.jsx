import { navigate, routes, Link } from '@redwoodjs/router'
import { Metadata, useMutation } from '@redwoodjs/web'
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
      <Metadata
        title="New Enrollment by Email"
        description="Enroll student by email page."
      />
      <Link
        to={routes.teacherGroupOptions({ id: id })}
        className="nes-btn h-10 w-48"
      >
        {'<- back'}
      </Link>
      <div className="max-w-m nes-text container block py-4  text-sm">
        Enter a student email address to enroll them to your group.
      </div>
      <TeacherGroupNewEnrollmentForm onSave={onSave} />
    </>
  )
}

export default TeacherGroupNewEnrollmentPage

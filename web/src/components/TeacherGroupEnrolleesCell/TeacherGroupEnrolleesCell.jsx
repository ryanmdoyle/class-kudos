import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { truncate } from 'src/lib/formatters'

export const QUERY = gql`
  query TeacherGroupEnrolleesQuery($id: String!) {
    enrolledUsers(id: $id) {
      id
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`

const DELETE_ENROLLMENT_MUTATION = gql`
  mutation DeleteEnrollmentMutation($id: String!) {
    deleteEnrollment(id: $id) {
      id
    }
  }
`

export const Loading = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative mb-4 overflow-visible">
    <span className="nes-text title relative -top-2">Enrolled Students</span>
    <table className="rw-table text-xs">
      <thead>
        <tr>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewEnrollment({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Student
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-gray-50">
          <td>Loading enrollments...</td>
        </tr>
      </tbody>
    </table>
  </div>
)

export const Empty = ({ id }) => (
  <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative mb-4 overflow-visible">
    <span className="nes-text title relative -top-2">Enrolled Students</span>
    <table className="rw-table text-xs">
      <thead>
        <tr>
          <th className="flex w-full flex-row-reverse">
            <Link
              to={routes.teacherGroupNewEnrollment({ id })}
              className="rw-button rw-button-green nes-button w-[200px]"
            >
              Add Student
            </Link>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-gray-50">
          <td>
            No enrollments yet, add some students by their email once they have
            created an account, or have them join with the enrollment ID (it's
            under the group name at the top of the page) to get started!
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ id, enrolledUsers }) => {
  const [deleteEnrollment] = useMutation(DELETE_ENROLLMENT_MUTATION, {
    onCompleted: () => {
      toast.success('Enrollment deleted')
    },
    onError: (error) => {
      console.log(error)
      toast.error(error.message)
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    refetchQueries: [{ query: QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (id, user) => {
    // console.log(id, user)
    if (
      confirm(
        'Are you sure you want to remove ' +
          user.firstName +
          ' from your group?'
      )
    ) {
      deleteEnrollment({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative mb-4 overflow-visible">
      <span className="nes-text title relative -top-2">Enrolled Students</span>
      <table className="rw-table text-xs">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th className="flex w-full flex-row-reverse">
              <Link
                to={routes.teacherGroupNewEnrollment({ id })}
                className="rw-button rw-button-green nes-button w-[200px]"
              >
                Add Student
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {enrolledUsers.map((enrollment) => {
            return (
              <tr key={enrollment.id}>
                <td>{truncate(enrollment.user.firstName)}</td>
                <td>{truncate(enrollment.user.email)}</td>

                <td>
                  <nav className="rw-table-actions">
                    <button
                      type="button"
                      title={
                        'Unenroll ' +
                        enrollment.user.firstName +
                        ' ' +
                        enrollment.user.lastName
                      }
                      className="rw-button rw-button-small rw-button-red ml-3"
                      onClick={() =>
                        onDeleteClick(enrollment.id, enrollment.user)
                      }
                    >
                      Unenroll
                    </button>
                  </nav>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

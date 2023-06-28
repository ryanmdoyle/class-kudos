import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY } from 'src/components/Enrollment/EnrollmentsCell'
import { truncate } from 'src/lib/formatters'

const DELETE_ENROLLMENT_MUTATION = gql`
  mutation DeleteEnrollmentMutation($id: String!) {
    deleteEnrollment(id: $id) {
      id
    }
  }
`

const EnrollmentsList = ({ enrollments }) => {
  const [deleteEnrollment] = useMutation(DELETE_ENROLLMENT_MUTATION, {
    onCompleted: () => {
      toast.success('Enrollment deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    refetchQueries: [{ query: QUERY }],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete enrollment ' + id + '?')) {
      deleteEnrollment({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>User id</th>
            <th>Group id</th>
            <th>Points</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => (
            <tr key={enrollment.id}>
              <td>{truncate(enrollment.id)}</td>
              <td>{truncate(enrollment.userId)}</td>
              <td>{truncate(enrollment.groupId)}</td>
              <td>{truncate(enrollment.points)}</td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.enrollment({ id: enrollment.id })}
                    title={'Show enrollment ' + enrollment.id + ' detail'}
                    className="rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editEnrollment({ id: enrollment.id })}
                    title={'Edit enrollment ' + enrollment.id}
                    className="rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={'Delete enrollment ' + enrollment.id}
                    className="rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(enrollment.id)}
                  >
                    Delete
                  </button>
                </nav>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EnrollmentsList

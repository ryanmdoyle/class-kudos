import { Link, routes, navigate } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import 'src/lib/formatters'

const DELETE_ENROLLMENT_MUTATION = gql`
  mutation DeleteEnrollmentMutation($id: String!) {
    deleteEnrollment(id: $id) {
      id
    }
  }
`

const Enrollment = ({ enrollment }) => {
  const [deleteEnrollment] = useMutation(DELETE_ENROLLMENT_MUTATION, {
    onCompleted: () => {
      toast.success('Enrollment deleted')
      navigate(routes.enrollments())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete enrollment ' + id + '?')) {
      deleteEnrollment({ variables: { id } })
    }
  }

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">
            Enrollment {enrollment.id} Detail
          </h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{enrollment.id}</td>
            </tr>
            <tr>
              <th>User id</th>
              <td>{enrollment.userId}</td>
            </tr>
            <tr>
              <th>Group id</th>
              <td>{enrollment.groupId}</td>
            </tr>
            <tr>
              <th>Points</th>
              <td>{enrollment.points}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link
          to={routes.editEnrollment({ id: enrollment.id })}
          className="rw-button rw-button-blue"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(enrollment.id)}
        >
          Delete
        </button>
      </nav>
    </>
  )
}

export default Enrollment

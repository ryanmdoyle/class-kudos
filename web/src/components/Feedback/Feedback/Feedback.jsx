import { Link, routes, navigate } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { timeTag } from 'src/lib/formatters'

const DELETE_FEEDBACK_MUTATION = gql`
  mutation DeleteFeedbackMutation($id: String!) {
    deleteFeedback(id: $id) {
      id
    }
  }
`

const Feedback = ({ feedback }) => {
  const [deleteFeedback] = useMutation(DELETE_FEEDBACK_MUTATION, {
    onCompleted: () => {
      toast.success('Feedback deleted')
      navigate(routes.feedbacks())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete feedback ' + id + '?')) {
      deleteFeedback({ variables: { id } })
    }
  }

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">
            Feedback {feedback.id} Detail
          </h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{feedback.id}</td>
            </tr>
            <tr>
              <th>Created at</th>
              <td>{timeTag(feedback.createdAt)}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{feedback.name}</td>
            </tr>
            <tr>
              <th>Value</th>
              <td>{feedback.value}</td>
            </tr>
            <tr>
              <th>User id</th>
              <td>{feedback.userId}</td>
            </tr>
            <tr>
              <th>Group id</th>
              <td>{feedback.groupId}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link
          to={routes.editFeedback({ id: feedback.id })}
          className="rw-button rw-button-blue"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(feedback.id)}
        >
          Delete
        </button>
      </nav>
    </>
  )
}

export default Feedback

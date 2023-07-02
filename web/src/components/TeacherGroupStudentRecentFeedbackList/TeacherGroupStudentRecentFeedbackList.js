import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY } from 'src/components/TeacherGroupStudentRecentFeedbackCell'
import { timeTag, truncate } from 'src/lib/formatters'

const DELETE_FEEDBACK_MUTATION = gql`
  mutation DeleteFeedbackMutation($id: String!) {
    deleteFeedback(id: $id) {
      id
    }
  }
`

const TeacherGroupStudentRecentFeedbackList = ({ feedbacks }) => {
  const [deleteFeedback] = useMutation(DELETE_FEEDBACK_MUTATION, {
    onCompleted: () => {
      toast.success('Feedback deleted')
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
    if (confirm('Are you sure you want to delete feedback ' + id + '?')) {
      deleteFeedback({ variables: { id } })
    }
  }

  const valueStyle = (value) => {
    if (value > 0) return 'nes-text is-success'
    if (value == 0) return 'nes-text'
    if (value < 0) return 'nes-text is-error'
  }
  return (
    <div className="nes-container with-title h-1/2">
      <p className="title relative bg-white">Recent Feedback</p>
      <div className="h-full overflow-y-scroll">
        <table className="rw-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Created at</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody className="nes-text text-xs">
            {feedbacks.map((feedback) => (
              <tr key={feedback.id} className="nes-text text-xs">
                <td>{truncate(feedback.name)}</td>
                <td className={valueStyle(feedback.value)}>
                  {truncate(feedback.value)}
                </td>
                <td>{timeTag(feedback.createdAt)}</td>

                <td>
                  <nav className="rw-table-actions">
                    <button
                      type="button"
                      title={'Delete feedback ' + feedback.id}
                      className="rw-button rw-button-small rw-button-red ml-2"
                      onClick={() => onDeleteClick(feedback.id)}
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
    </div>
  )
}

export default TeacherGroupStudentRecentFeedbackList

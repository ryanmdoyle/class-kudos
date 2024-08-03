import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as ENROLLED_STUDENTS_LIST_QUERY } from 'src/components/TeacherGroupEnrolledCell'
import { QUERY as TEACHER_GROUP_HEADER_QUERY } from 'src/components/TeacherGroupHeaderCell'
import { timeTag, truncate } from 'src/lib/formatters'

const DELETE_FEEDBACK_MUTATION = gql`
  mutation DeleteFeedbackMutation($id: String!) {
    deleteFeedback(id: $id) {
      id
    }
  }
`

export const QUERY = gql`
  query FindTeacherGroupStudentRecentFeedbackQuery(
    $userId: String!
    $groupId: String
    $take: Int
  ) {
    feedbackOfUser: feedbackOfUser(
      userId: $userId
      groupId: $groupId
      take: $take
    ) {
      id
      name
      value
      createdAt
    }
  }
`

export const Loading = () => (
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
          <tr>
            <td>Loading...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

export const Empty = () => (
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
          <tr>
            <td>No Feedback for student</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ feedbackOfUser, userId, groupId }) => {
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
    refetchQueries: [
      {
        query: QUERY,
        variables: { userId: userId, groupId: groupId, take: 10 },
      },
      { query: ENROLLED_STUDENTS_LIST_QUERY, variables: { id: groupId } },
      { query: TEACHER_GROUP_HEADER_QUERY, variables: { id: groupId } },
    ],
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
    <div className="nes-container with-title h-1/2 pr-0">
      <p className="title relative bg-white">Recent Feedback</p>
      <div className="h-full overflow-y-scroll pr-2">
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
            {feedbackOfUser.map((feedback) => (
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

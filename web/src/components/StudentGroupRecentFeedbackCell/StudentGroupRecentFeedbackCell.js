import { Link, routes } from '@redwoodjs/router'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as ENROLLED_STUDENTS_LIST_QUERY } from 'src/components/TeacherGroupEnrolledCell'
import { QUERY as TEACHER_GROUP_HEADER_QUERY } from 'src/components/TeacherGroupHeaderCell'
import { timeTag, truncate } from 'src/lib/formatters'

export const QUERY = gql`
  query FindStudentGroupRecentFeedbackQuery(
    $userId: String!
    $groupId: String
    $take: Int
  ) {
    studentGroupRecentFeedback: feedbackOfUser(
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
          <td>Loading...</td>
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
          <td>No Feedback for student</td>
        </tbody>
      </table>
    </div>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ studentGroupRecentFeedback }) => {
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
            {studentGroupRecentFeedback.map((feedback) => (
              <tr key={feedback.id} className="nes-text text-xs">
                <td>{truncate(feedback.name)}</td>
                <td className={valueStyle(feedback.value)}>
                  {truncate(feedback.value)}
                </td>
                <td>{timeTag(feedback.createdAt)}</td>

                <td>
                  <nav className="rw-table-actions">
                    {/* <button
                      type="button"
                      title={'Delete feedback ' + feedback.id}
                      className="rw-button rw-button-small rw-button-red ml-2"
                      onClick={() => onDeleteClick(feedback.id)}
                    >
                      Delete
                    </button> */}
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

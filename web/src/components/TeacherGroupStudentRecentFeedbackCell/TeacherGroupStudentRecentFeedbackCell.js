import TeacherGroupStudentRecentFeedbackList from 'src/components/TeacherGroupStudentRecentFeedbackList/TeacherGroupStudentRecentFeedbackList'

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

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ feedbackOfUser }) => {
  return <TeacherGroupStudentRecentFeedbackList feedbacks={feedbackOfUser} />
}

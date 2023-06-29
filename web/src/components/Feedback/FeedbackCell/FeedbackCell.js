import Feedback from 'src/components/Feedback/Feedback'

export const QUERY = gql`
  query FindFeedbackById($id: String!) {
    feedback: feedback(id: $id) {
      id
      createdAt
      name
      value
      userId
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Feedback not found</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ feedback }) => {
  return <Feedback feedback={feedback} />
}

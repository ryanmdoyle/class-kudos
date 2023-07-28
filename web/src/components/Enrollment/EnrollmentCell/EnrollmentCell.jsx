import Enrollment from 'src/components/Enrollment/Enrollment'

export const QUERY = gql`
  query FindEnrollmentById($id: String!) {
    enrollment: enrollment(id: $id) {
      id
      userId
      groupId
      points
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Enrollment not found</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ enrollment }) => {
  return <Enrollment enrollment={enrollment} />
}

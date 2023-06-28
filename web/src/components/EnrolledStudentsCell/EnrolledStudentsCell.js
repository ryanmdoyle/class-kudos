export const QUERY = gql`
  query EnrolledStudentsQuery($id: String!) {
    enrollment(id: $id) {
      id
      points
      user {
        firstName
        lastName
      }
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enrolledStudents }) => {
  return (
    <ul>
      {enrolledStudents.map((item) => {
        return <li key={item.id}>{JSON.stringify(item)}</li>
      })}
    </ul>
  )
}

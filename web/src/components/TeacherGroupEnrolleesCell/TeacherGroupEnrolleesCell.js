export const QUERY = gql`
  query TeacherGroupEnrolleesQuery {
    teacherGroupEnrollees {
      id
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ teacherGroupEnrollees }) => {
  return (
    <ul>
      {teacherGroupEnrollees.map((item) => {
        return <li key={item.id}>{JSON.stringify(item)}</li>
      })}
    </ul>
  )
}

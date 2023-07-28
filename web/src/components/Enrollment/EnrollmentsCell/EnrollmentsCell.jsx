import { Link, routes } from '@redwoodjs/router'

import Enrollments from 'src/components/Enrollment/Enrollments'

export const QUERY = gql`
  query FindEnrollments {
    enrollments {
      id
      userId
      groupId
      points
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => {
  return (
    <div className="rw-text-center">
      {'No enrollments yet. '}
      <Link to={routes.newEnrollment()} className="rw-link">
        {'Create one?'}
      </Link>
    </div>
  )
}

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ enrollments }) => {
  return <Enrollments enrollments={enrollments} />
}

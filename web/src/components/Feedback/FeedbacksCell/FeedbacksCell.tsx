import type { FindFeedbacks } from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'

import { Link, routes } from '@redwoodjs/router'

import Feedbacks from 'src/components/Feedback/Feedbacks'

export const QUERY = gql`
  query FindFeedbacks {
    feedbacks {
      id
      createdAt
      name
      value
      userId
      behaviorId
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => {
  return (
    <div className="rw-text-center">
      {'No feedbacks yet. '}
      <Link
        to={routes.newFeedback()}
        className="rw-link"
      >
        {'Create one?'}
      </Link>
    </div>
  )
}

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rw-cell-error">{error.message}</div>
)

export const Success = ({ feedbacks }: CellSuccessProps<FindFeedbacks>) => {
  return <Feedbacks feedbacks={feedbacks} />
}

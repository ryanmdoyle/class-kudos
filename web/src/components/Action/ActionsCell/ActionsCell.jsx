import { Link, routes } from '@redwoodjs/router'

import Actions from 'src/components/Action/Actions'

export const QUERY = gql`
  query FindActions {
    actions {
      id
      name
      value
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => {
  return (
    <div className="rw-text-center">
      {'No actions yet. '}
      <Link to={routes.newAction()} className="rw-link">
        {'Create one?'}
      </Link>
    </div>
  )
}

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ actions }) => {
  return <Actions actions={actions} />
}

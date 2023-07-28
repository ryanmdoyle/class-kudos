import { Link, routes } from '@redwoodjs/router'

import Rewards from 'src/components/Reward/Rewards'

export const QUERY = gql`
  query FindRewards {
    rewards {
      id
      name
      cost
      responseRequired
      responsePrompt
      groupId
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => {
  return (
    <div className="rw-text-center">
      {'No rewards yet. '}
      <Link to={routes.newReward()} className="rw-link">
        {'Create one?'}
      </Link>
    </div>
  )
}

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ rewards }) => {
  return <Rewards rewards={rewards} />
}

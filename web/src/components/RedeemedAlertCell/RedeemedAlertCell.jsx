export const QUERY = gql`
  query redeemedOfGroupRequested($groupId: String!) {
    redeemedOfGroupRequested: redeemedOfGroupRequested(groupId: $groupId) {
      id
    }
  }
`

export const beforeQuery = (props) => {
  return {
    variables: props,
    fetchPolicy: 'cache-and-network',
    pollInterval: 1000 * 60 * 5,
  }
}

export const Loading = () => null

export const Empty = () => null

export const Failure = ({ error }) => (
  <div href="#" className={`nes-badge w-8`}>
    <span className="is-error">!</span>
  </div>
)

export const Success = ({ redeemedOfGroupRequested }) => {
  return (
    <div
      href="#"
      className={`nes-badge ${
        redeemedOfGroupRequested?.length > 99 ? 'w-14' : 'w-8'
      }`}
    >
      <span className="is-warning">{redeemedOfGroupRequested?.length}</span>
    </div>
  )
}

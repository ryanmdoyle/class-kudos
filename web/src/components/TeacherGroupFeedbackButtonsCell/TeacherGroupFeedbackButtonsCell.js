export const QUERY = gql`
  query TeacherGroupFeedbackButtonsQuery($id: String!) {
    actionsOfGroup(id: $id) {
      id
      name
      value
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ actionsOfGroup, studentId }) => {
  return (
    <div className="nes-container with-title h-1/2">
      <span className="title relative -top-2">Give Feedback</span>
      <div className="flex flex-wrap justify-around gap-2 max-h-full overflow-y-scroll">
        {actionsOfGroup.map((action) => (
          <button key={action.id} className="nes-btn text-xs">
            <span className="inline-block mr-3">{action.name}</span>
            {action.value >= 0 ? (
              <span className="inline-block">{action.value}</span>
            ) : (
              <span className="inline-block nes-text is-error">
                {action.value}
              </span>
            )}
            <i className="nes-icon coin is-small inline-block"></i>
          </button>
        ))}
      </div>
    </div>
  )
}

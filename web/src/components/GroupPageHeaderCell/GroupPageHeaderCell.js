export const QUERY = gql`
  query GroupPageHeaderQuery($id: String!) {
    groupPageHeader: group(id: $id) {
      id
      name
      description
      enrollId
      enrollments {
        id
      }
    }
  }
`

export const Loading = () => (
  <div className="nes-container flex justify-between mb-8">
    <div className="flex flex-col">
      <span className="text-2xl">Loading Group...</span>
      <span className="text-xs nes-text text-gray-400 hover:text-gray-800">
        Enroll ID: loading...
      </span>
    </div>
    <div className="flex">
      <i className="nes-icon coin is-medium"></i>
      <div className="flex flex-col ml-4">
        <span className="text-3xl">567</span>
        <span className="text-xs">total kudos</span>
      </div>
    </div>
  </div>
)

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ groupPageHeader }) => {
  console.log(groupPageHeader.enrollments)
  return (
    <div className="nes-container flex justify-between mb-8">
      <div className="flex flex-col">
        <span className="text-2xl">{groupPageHeader.name}</span>
        <span className="text-xs nes-text text-gray-400 hover:text-gray-800">
          Enroll ID: {groupPageHeader.enrollId}
        </span>
      </div>
      <div className="flex">
        <i className="nes-icon coin is-medium"></i>
        <div className="flex flex-col ml-4">
          <span className="text-3xl">
            <i>total</i>
          </span>
          <span className="text-xs">total kudos</span>
        </div>
      </div>
    </div>
  )
}

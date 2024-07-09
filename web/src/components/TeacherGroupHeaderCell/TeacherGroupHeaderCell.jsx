import { toast } from '@redwoodjs/web/toast'

export const QUERY = gql`
  query TeacherGroupHeaderQuery($id: String!) {
    TeacherGroupHeader: group(id: $id) {
      id
      name
      description
      enrollId
      awardedPoints
      enrollments {
        id
      }
    }
  }
`

export const Loading = () => (
  <div className="nes-container mb-4 flex justify-between">
    <div className="flex flex-col">
      <span className="text-2xl">Loading Group...</span>
      <span className="nes-text text-xs text-gray-400 hover:text-gray-800">
        Enroll ID: loading...
      </span>
    </div>
    <div className="flex">
      <i className="nes-icon coin is-medium"></i>
      <div className="ml-4 flex flex-col">
        <span className="text-3xl">...</span>
        <span className="text-xs">
          <i>total kudos</i>
        </span>
      </div>
    </div>
  </div>
)

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ TeacherGroupHeader }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(TeacherGroupHeader.enrollId)
    toast.success('Copied Enroll ID!')
  }
  return (
    <div className="nes-container mb-4 flex justify-between">
      <div className="flex flex-col">
        <span className="text-2xl">{TeacherGroupHeader.name}</span>
        <button
          className="nes-text text-xs text-gray-400 hover:text-gray-800"
          onClick={handleCopy}
        >
          Enroll ID: {TeacherGroupHeader.enrollId}
        </button>
      </div>
      <div className="flex">
        <i className="nes-icon coin is-medium"></i>
        <div className="ml-4 flex flex-col">
          <span className="text-3xl">{TeacherGroupHeader.awardedPoints}</span>
          <span className="text-xs">
            <i>total kudos</i>
          </span>
        </div>
      </div>
    </div>
  )
}

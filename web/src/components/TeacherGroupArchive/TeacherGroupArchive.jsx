import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

const ARCHIVE_GROUP_MUTATION = gql`
  mutation ArchiveGroupMutation($id: String!) {
    archiveGroup(id: $id) {
      id
    }
  }
`

const TeacherGroupArchive = ({ id }) => {
  const [archiveGroup] = useMutation(ARCHIVE_GROUP_MUTATION, {
    onCompleted: () => {
      toast.success('Group archived!')
      navigate(routes.teacher())
    },
    onError: (error) => {
      toast.error(error.message)
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    // refetchQueries: [{ query: QUERY }],
    // awaitRefetchQueries: true,
  })

  const onDeleteClick = (id) => {
    if (
      confirm(
        'Are you sure you want to archive group? This action cannot be undone!'
      )
    ) {
      archiveGroup({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative mb-4 overflow-visible">
      <span className="nes-text title relative -top-2">Archive Group</span>
      <div className="flex w-full justify-between">
        <div>
          <p>
            Finished with your group? Remove it here. This action cannot be
            undone!
          </p>
        </div>
        <div>
          <button
            type="button"
            title={'Archive Group'}
            className="rw-button rw-button-small rw-button-red ml-3"
            onClick={() => onDeleteClick(id)}
          >
            Archive Group
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeacherGroupArchive

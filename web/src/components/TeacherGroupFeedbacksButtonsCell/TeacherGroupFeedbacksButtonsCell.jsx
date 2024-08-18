import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { useSelectedContext } from 'src/components/Context/SelectedEnrolledContext'
import { QUERY as ENROLLED_STUDENTS_LIST_QUERY } from 'src/components/TeacherGroupEnrolledCell'
import { QUERY as TEACHER_GROUP_HEADER_QUERY } from 'src/components/TeacherGroupHeaderCell'

const CREATE_FEEDBACKS_MUTATION = gql`
  mutation CreateFeedbacksMutation($input: CreateFeedbacksInput!) {
    createFeedbacks(input: $input)
  }
`
export const QUERY = gql`
  query TeacherGroupFeedbackButtonsQuery($id: String!) {
    actionsOfGroup(id: $id) {
      id
      name
      value
    }
  }
`

export const Loading = () => (
  <div className="nes-container with-title h-1/2">
    <span className="title relative -top-2">Give Feedback</span>
    <div className="flex max-h-full flex-wrap justify-around gap-2 overflow-y-scroll">
      Loading...
    </div>
  </div>
)

export const Empty = () => (
  <div className="nes-container with-title h-1/2">
    <span className="title relative -top-2">Give Feedback</span>
    <div className="flex max-h-full flex-wrap justify-around gap-2 overflow-y-scroll">
      No actions have been created yet! Actions are different types of tasks,
      behaviors, or consequences that you can give students feedback for. Head
      over to the Options page to get started making actions for your group.
    </div>
  </div>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ actionsOfGroup, id, studentId }) => {
  const selected = useSelectedContext()

  const [createFeedbacks, { loading, error }] = useMutation(
    CREATE_FEEDBACKS_MUTATION,
    {
      onCompleted: () => {
        toast.success('Kudos Awarded!')
        selected.clearSelected()
      },
      onError: (error) => {
        toast.error(error.message)
      },
      refetchQueries: [
        { query: ENROLLED_STUDENTS_LIST_QUERY, variables: { id } },
        { query: TEACHER_GROUP_HEADER_QUERY, variables: { id } },
      ],
      awaitRefetchQueries: true,
    }
  )

  const handleCreateFeedbacks = (action) => {
    // make array of student ID's
    const studentIds = selected.selectedUsers.map((user) => user.userId)
    // create, passing in array of awarded
    createFeedbacks({
      variables: {
        input: {
          name: action.name,
          value: parseInt(action.value),
          userIds: studentIds,
          groupId: id,
        },
      },
    })
  }

  return (
    <>
      <div className="nes-container with-title h-1/2 pb-4 pr-0">
        <span className="title relative -top-2">Give Feedback</span>
        <div className="flex max-h-full flex-wrap justify-around gap-2 overflow-y-scroll pr-2">
          {actionsOfGroup.map((action) => {
            return (
              <button
                key={action.id}
                className="nes-btn text-s"
                onClick={() => {
                  handleCreateFeedbacks(action)
                }}
              >
                <span className="mr-3 inline-block">{action.name}</span>
                {action.value >= 0 ? (
                  <span className="inline-block">{action.value}</span>
                ) : (
                  <span className="nes-text is-error inline-block">
                    {action.value}
                  </span>
                )}
                <i className="nes-icon coin is-small inline-block"></i>
              </button>
            )
          })}
        </div>
      </div>
      <div className="nes-container with-title relative h-1/2 pb-2 pr-0">
        <span className="title relative -top-2">Selected:</span>
        <ul className="flex max-h-full flex-wrap gap-4 overflow-y-scroll pr-2">
          {selected.selectedUsers.map((enrollment) => (
            <li key={enrollment.id}>{enrollment.user.firstName}</li>
          ))}
        </ul>
        {selected.selectedUsers.length > 0 && (
          <button
            className="nes-btn is-error absolute -right-4 -top-4"
            onClick={selected.clearSelected}
          >
            X
          </button>
        )}
      </div>
    </>
  )
}

import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as ENROLLED_STUDENTS_LIST_QUERY } from 'src/components/TeacherGroupEnrolledCell'
import { QUERY as TEACHER_GROUP_HEADER_QUERY } from 'src/components/TeacherGroupHeaderCell'
import { QUERY as TEACHER_GROUP_STUDENT_RECENT_FEEDBACK_QUERY } from 'src/components/TeacherGroupStudentRecentFeedbackCell'

const CREATE_FEEDBACK_MUTATION = gql`
  mutation CreateFeedbackMutation($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
      id
    }
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
  const [createFeedback, { loading, error }] = useMutation(
    CREATE_FEEDBACK_MUTATION,
    {
      onCompleted: () => {
        toast.success('Kudos Awarded!')
      },
      onError: (error) => {
        toast.error(error.message)
      },
      refetchQueries: [
        { query: ENROLLED_STUDENTS_LIST_QUERY, variables: { id } },
        { query: TEACHER_GROUP_HEADER_QUERY, variables: { id } },
        {
          query: TEACHER_GROUP_STUDENT_RECENT_FEEDBACK_QUERY,
          variables: { userId: studentId, groupId: id, take: 10 },
        },
      ],
      awaitRefetchQueries: true,
    }
  )

  return (
    <div className="nes-container with-title h-1/2 pb-0 pr-0">
      <span className="title relative -top-2">Give Feedback</span>
      <div className="flex max-h-full flex-wrap justify-around gap-2 overflow-y-scroll pr-2">
        {actionsOfGroup.map((action) => {
          const handleClick = () => {
            createFeedback({
              variables: {
                input: {
                  name: action.name,
                  value: parseInt(action.value),
                  userId: studentId,
                  groupId: id,
                },
              },
            })
          }

          return (
            <button
              key={action.id}
              className="nes-btn text-s"
              onClick={handleClick}
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
  )
}

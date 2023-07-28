import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { truncate } from 'src/lib/formatters'

export const QUERY = gql`
  query TeacherGroupEnrolleesQuery($id: String!) {
    enolledUsers(id: $id) {
      id
      user {
        id
        firstName
        lastName
        email
        resetToken
        resetTokenExpiresAt
      }
    }
  }
`

// const DELETE_REWARD_MUTATION = gql`
//   mutation DeleteRewardMutation($id: String!) {
//     deleteReward(id: $id) {
//       id
//     }
//   }
// `

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ enolledUsers }) => {
  const now = Date.now()
  return (
    <div className="rw-segment rw-table-wrapper-responsive nes-container with-title relative mb-4 overflow-visible">
      <span className="nes-text title relative -top-2">Enrolled Students</span>
      <table className="rw-table text-xs">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {enolledUsers.map((enrollment) => {
            return (
              <tr key={enrollment.id}>
                <td>{truncate(enrollment.user.firstName)}</td>
                <td>{truncate(enrollment.user.email)}</td>

                <td>
                  <nav className="rw-table-actions">
                    <button
                      type="button"
                      title={
                        'Unenroll ' +
                        enrollment.user.firstName +
                        enrollment.user.lastName
                      }
                      className="rw-button rw-button-small rw-button-red ml-3"
                      // onClick={() => onDeleteClick(reward.id)}
                    >
                      Unenroll
                    </button>
                  </nav>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
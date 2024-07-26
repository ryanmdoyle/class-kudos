import { NavLink, routes, useMatch } from '@redwoodjs/router'

import { useSelectedContext } from 'src/components/Context/SelectedEnrolledContext'
import TeacherGroupEnrolledListLink from 'src/components/TeacherGroupEnrolledListLink/TeacherGroupEnrolledListLink'

export const QUERY = gql`
  query EnolledUsersQuery($id: String!) {
    enrolledUsers(id: $id) {
      id
      points
      groupId
      userId
      user {
        firstName
        lastName
      }
    }
  }
`

export const Loading = () => (
  <ul className="nes-container with-title h-full px-4 pb-3">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="mb-3 flex justify-between">
        <p className="inline-block">Loading...</p>
      </li>
    </div>
  </ul>
)

export const Empty = () => (
  <ul className="nes-container with-title h-full px-4 pb-3">
    <span className="nes-text title relative -top-2">Students</span>
    <div className="overflow-y-scroll">
      <li className="mb-3">
        <p>Get started by enrolling students.</p>
        <p className="mt-4">
          Students can create their own accounts, then enroll in your group
          using the Enroll ID. You can find the ID under the group name.
        </p>
      </li>
    </div>
  </ul>
)

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ id, enrolledUsers }) => {
  const isMulti = useMatch('/teacher/group/{id}/multi').match
  const selected = useSelectedContext()
  const selectedIds = selected?.selectedUsers
    ? selected.selectedUsers?.map((enrollment) => enrollment.userId)
    : null

  const handleClick = (enrollment) => {
    selected.toggleSelectedUser(enrollment)
  }

  return (
    <div className="nes-container with-title h-full p-0">
      <span className="nes-text title absolute left-4 top-4">Students</span>

      <div className="h-full overflow-hidden">
        <div className="my-4 flex w-full justify-between gap-4 px-4">
          <NavLink
            className={`nes-btn title relative`}
            activeClassName={!isMulti && 'is-success'}
            matchSubPaths={true}
            to={routes.teacherGroup({ id: id })}
          >
            Single
          </NavLink>
          <NavLink
            className={`nes-btn title relative`}
            activeClassName={'is-success'}
            to={routes.teacherGroupStudents({ id: id })}
          >
            Multi
          </NavLink>
        </div>
        <ul className="relative h-full overflow-y-scroll pl-4">
          {isMulti
            ? enrolledUsers.map((enrollment) => {
                const color = selectedIds?.includes(enrollment.userId)
                  ? 'nes-text is-primary'
                  : 'nes-text'
                return (
                  <li key={enrollment.id}>
                    <button
                      onClick={() => {
                        handleClick(enrollment)
                      }}
                      className={`inline flex w-full justify-between pb-3 pr-2 hover:underline ${color}`}
                    >
                      <div>
                        {enrollment?.user?.firstName}{' '}
                        {enrollment?.user?.lastName}
                      </div>
                      <div>{enrollment?.points}</div>
                    </button>
                  </li>
                )
              })
            : enrolledUsers.map((enrollment) => {
                return (
                  <TeacherGroupEnrolledListLink
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                )
              })}
        </ul>
      </div>
    </div>
  )
}

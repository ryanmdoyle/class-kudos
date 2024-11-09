import { NavLink, routes } from '@redwoodjs/router'

import { useAuth } from 'src/auth'
import StudentGroupHeaderCell from 'src/components/StudentGroupHeaderCell/StudentGroupHeaderCell'

const StudentLayout = ({ children, groupId }) => {
  const { currentUser } = useAuth()

  return (
    <>
      <div className="mb-4 flex w-full justify-center gap-x-8">
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            to={routes.student()}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            matchSubPaths="true"
            to={routes.studentGroup({ id: groupId })}
          >
            Feedback
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            matchSubPaths="true"
            to={routes.studentGroupRewards({ id: groupId })}
          >
            Store
          </NavLink>
        </button>
      </div>
      <StudentGroupHeaderCell groupId={groupId} userId={currentUser?.id} />
      <div className="teacher-content">{children}</div>
    </>
  )
}

export default StudentLayout

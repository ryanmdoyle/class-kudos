import { NavLink, routes } from '@redwoodjs/router'

import StudentGroupHeaderCell from 'src/components/StudentGroupHeaderCell/StudentGroupHeaderCell'

const StudentLayout = ({ children, groupId }) => {
  return (
    <>
      <div className="flex w-full justify-center gap-x-8 mb-4">
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.student()}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            matchSubPaths="true"
            to={routes.studentGroup({ id: groupId })}
          >
            Feedback
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            matchSubPaths="true"
            to={routes.studentGroupRewards({ id: groupId })}
          >
            Store
          </NavLink>
        </button>
      </div>
      <StudentGroupHeaderCell groupId={groupId} />
      <div className="teacher-content">{children}</div>
    </>
  )
}

export default StudentLayout

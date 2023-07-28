import { NavLink, routes } from '@redwoodjs/router'

import TeacherGroupHeaderCell from 'src/components/TeacherGroupHeaderCell/TeacherGroupHeaderCell'

const TeacherLayout = ({ children, groupId }) => {
  return (
    <>
      <div className="flex w-full justify-center gap-x-8 mb-4">
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.teacher()}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            matchSubPaths="true"
            to={routes.teacherGroup({ id: groupId })}
          >
            Feedback
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.teacherGroupStore({ id: groupId })}
          >
            Store
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.teacherGroupOptions({ id: groupId })}
          >
            Options
          </NavLink>
        </button>
      </div>
      <TeacherGroupHeaderCell id={groupId} />
      <div className="teacher-content">{children}</div>
    </>
  )
}

export default TeacherLayout

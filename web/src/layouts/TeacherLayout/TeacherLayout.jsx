import { NavLink, routes } from '@redwoodjs/router'

import RedeemedAlertCell from 'src/components/RedeemedAlertCell/RedeemedAlertCell'
import TeacherGroupHeaderCell from 'src/components/TeacherGroupHeaderCell/TeacherGroupHeaderCell'

const TeacherLayout = ({ children, groupId }) => {
  return (
    <>
      <div className="mb-4 flex w-full justify-center gap-x-8">
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            to={routes.teacher()}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            matchSubPaths="true"
            to={routes.teacherGroup({ id: groupId })}
          >
            Feedback
          </NavLink>
        </button>
        <div className="relative">
          <button>
            <NavLink
              className="nes-btn is-primary"
              activeClassName="nes-btn is-success"
              to={routes.teacherGroupStore({ id: groupId })}
            >
              Store
            </NavLink>
            <div className="absolute -top-4 right-0">
              <RedeemedAlertCell groupId={groupId} />
            </div>
          </button>
        </div>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
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

import { NavLink, routes, useLocation } from '@redwoodjs/router'

import { useAuth } from 'src/auth'
import TeacherGroupHeaderCell from 'src/components/TeacherGroupHeaderCell/TeacherGroupHeaderCell'

const TeacherLayout = ({ children, groupId }) => {
  const { isAuthenticated, hasRole } = useAuth()
  // const { pathname, search, hash } = useLocation()
  // console.log(pathname)

  const HomeButton = () => {
    if (isAuthenticated && !hasRole('TEACHER')) {
      return (
        <NavLink
          className="nes-btn is-primary"
          activeClassName="is-success"
          to={routes.student()}
        >
          Home
        </NavLink>
      )
    }
    if (isAuthenticated && hasRole('TEACHER')) {
      return (
        <NavLink
          className="nes-btn is-primary"
          activeClassName="is-success"
          to={routes.teacher()}
        >
          Home
        </NavLink>
      )
    }
    return (
      <NavLink
        className="nes-btn is-primary"
        activeClassName="is-success"
        to={routes.teacher()}
      >
        Home
      </NavLink>
    )
  }

  return (
    <>
      <div className="flex w-full justify-center gap-x-8 mb-6">
        <button>
          <HomeButton />
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
      {children}
    </>
  )
}

export default TeacherLayout

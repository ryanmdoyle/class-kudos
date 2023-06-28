import { NavLink, routes, useLocation } from '@redwoodjs/router'

import { useAuth } from 'src/auth'

const TeacherGroupLayout = ({ children, groupId }) => {
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
      <div className="flex w-full justify-center gap-x-8 mb-8">
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
            to={routes.home()}
          >
            Store
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.home()}
          >
            Options
          </NavLink>
        </button>
      </div>
      {children}
    </>
  )
}

export default TeacherGroupLayout
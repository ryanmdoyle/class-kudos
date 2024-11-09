import { NavLink, routes } from '@redwoodjs/router'

import { useAuth } from 'src/auth'

const TeacherLayout = ({ children, groupId }) => {
  const { isAuthenticated, hasRole } = useAuth()

  const HomeButton = () => {
    if (isAuthenticated && !hasRole('TEACHER')) {
      return (
        <NavLink
          className="nes-btn is-primary"
          activeClassName="nes-btn is-success"
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
          activeClassName="nes-btn is-success"
          to={routes.teacher()}
        >
          Home
        </NavLink>
      )
    }
    return (
      <NavLink
        className="nes-btn is-primary"
        activeClassName="nes-btn is-success"
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
            activeClassName="nes-btn is-success"
            matchSubPaths="true"
            to={routes.teacherGroup({ id: groupId })}
          >
            Feedback
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            to={routes.home()}
          >
            Store
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="nes-btn is-success"
            to={routes.groupOptions({ id: groupId })}
          >
            Options
          </NavLink>
        </button>
      </div>
      {children}
    </>
  )
}

export default TeacherLayout

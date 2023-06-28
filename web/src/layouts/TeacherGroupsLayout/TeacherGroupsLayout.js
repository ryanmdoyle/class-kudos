import { NavLink, routes } from '@redwoodjs/router'

const TeacherGroupLayout = ({ children, groupId }) => {
  return (
    <>
      <div className="flex w-full justify-center gap-x-8 mb-8">
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
            to={routes.home()}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            className="nes-btn is-primary"
            activeClassName="is-success"
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

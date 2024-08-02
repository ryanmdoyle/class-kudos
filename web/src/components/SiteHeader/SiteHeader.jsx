import { navigate, routes, Link } from '@redwoodjs/router'

import { useAuth } from 'src/auth'

const SiteHeader = () => {
  const { isAuthenticated, logOut, hasRole } = useAuth()

  const handleLogOut = () => {
    logOut()
    navigate(routes.home())
  }

  const handleLogIn = () => {
    navigate(routes.login())
  }

  const handleHomeClick = () => {
    navigate(routes.home())
  }

  return (
    <div className="mb-4 flex h-[48px] justify-between">
      <div
        className="nes-pointer flex h-full justify-center align-text-bottom"
        onClick={handleHomeClick}
      >
        <i className="nes-icon coin mt-2 h-[36px]"></i>
        <h1 className="mt-2 h-[36px] pl-4 text-2xl">Class Kudos</h1>
      </div>
      <div className="flex gap-2">
        {hasRole('TEACHER') && (
          <Link to={routes.teacherProfile()} className="nes-btn h-10">
            Edit Profile
          </Link>
        )}
        {isAuthenticated ? (
          <button className="nes-btn" onClick={handleLogOut}>
            Logout
          </button>
        ) : (
          <button className="nes-btn is-primary" onClick={handleLogIn}>
            Log In
          </button>
        )}
      </div>
    </div>
  )
}

export default SiteHeader

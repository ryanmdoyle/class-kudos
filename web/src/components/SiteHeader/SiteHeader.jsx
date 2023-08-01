import { navigate, routes } from '@redwoodjs/router'

import { useAuth } from 'src/auth'

const SiteHeader = () => {
  const { isAuthenticated, currentUser, logOut } = useAuth()

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
  )
}

export default SiteHeader

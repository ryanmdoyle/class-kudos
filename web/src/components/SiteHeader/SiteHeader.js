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
  console.log(isAuthenticated)

  return (
    <div className="flex justify-between mb-2">
      <div className="flex content-center">
        <i className="nes-icon coin"></i>
        <h1 className="pl-4 text-2xl">Class Kudos</h1>
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

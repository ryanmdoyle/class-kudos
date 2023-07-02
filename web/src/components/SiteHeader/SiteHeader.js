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

  return (
    <div className="flex justify-between mb-4 h-[48px]">
      <div className="flex justify-center align-text-bottom h-full">
        <i className="nes-icon coin h-[36px] mt-2"></i>
        <h1 className="pl-4 text-2xl h-[36px] mt-2">Class Kudos</h1>
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

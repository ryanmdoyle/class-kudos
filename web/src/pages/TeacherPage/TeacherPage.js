import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

const TeacherPage = () => {
  const { isAuthenticated, currentUser, logOut } = useAuth()
  console.log(isAuthenticated, currentUser)
  return (
    <>
      <MetaTags title="Teacher" description="Teacher page" />

      <h1>TeacherPage</h1>
      <p>
        Find me in <code>./web/src/pages/TeacherPage/TeacherPage.js</code>
      </p>
      <p>
        My default route is named <code>teacher</code>, link to me with `
        <Link to={routes.teacher()}>Teacher</Link>`
      </p>
    </>
  )
}

export default TeacherPage

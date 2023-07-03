import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

const StudentGroupPage = ({ id }) => {
  return (
    <>
      <MetaTags title="StudentGroup" description="StudentGroup page" />

      <h1>StudentGroupPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/StudentGroupPage/StudentGroupPage.js</code>
      </p>
      <p>
        My default route is named <code>studentGroup</code>, link to me with `
        <Link to={routes.studentGroup({ id: id })}>StudentGroup</Link>`
      </p>
    </>
  )
}

export default StudentGroupPage

import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

const GroupOptionsPage = () => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />

      <h1>GroupOptionsPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GroupOptionsPage/GroupOptionsPage.js</code>
      </p>
      <p>
        My default route is named <code>groupOptions</code>, link to me with `
        <Link to={routes.groupOptions()}>GroupOptions</Link>`
      </p>
    </>
  )
}

export default GroupOptionsPage

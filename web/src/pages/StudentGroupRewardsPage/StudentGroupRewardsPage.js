import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

const StudentGroupRewardsPage = () => {
  return (
    <>
      <MetaTags
        title="StudentGroupRewards"
        description="StudentGroupRewards page"
      />

      <h1>StudentGroupRewardsPage</h1>
      <p>
        Find me in{' '}
        <code>
          ./web/src/pages/StudentGroupRewardsPage/StudentGroupRewardsPage.js
        </code>
      </p>
      <p>
        My default route is named <code>studentGroupRewards</code>, link to me
        with `<Link to={routes.studentGroupRewards()}>StudentGroupRewards</Link>
        `
      </p>
    </>
  )
}

export default StudentGroupRewardsPage

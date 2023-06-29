import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import GroupActionsCell from 'src/components/GroupActionsCell/GroupActionsCell'

const GroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      {id}
      <GroupActionsCell id={id} />
    </>
  )
}

export default GroupOptionsPage

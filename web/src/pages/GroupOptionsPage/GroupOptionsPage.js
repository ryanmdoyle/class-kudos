import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import GroupActionsCell from 'src/components/GroupActionsCell/GroupActionsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const GroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      <TeacherLayout groupId={id}></TeacherLayout>
      <GroupActionsCell id={id} />
    </>
  )
}

export default GroupOptionsPage

import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import TeadcherGroupActionsCell from 'src/components/TeadcherGroupActionsCell/TeadcherGroupActionsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const GroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      <TeacherLayout groupId={id}></TeacherLayout>
      <TeadcherGroupActionsCell id={id} />
    </>
  )
}

export default GroupOptionsPage

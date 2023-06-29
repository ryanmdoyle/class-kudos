import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import TeacherGroupActionsCell from 'src/components/TeacherGroupActionsCell/TeacherGroupActionsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const GroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      <TeacherLayout groupId={id}></TeacherLayout>
      <TeacherGroupActionsCell id={id} />
    </>
  )
}

export default GroupOptionsPage

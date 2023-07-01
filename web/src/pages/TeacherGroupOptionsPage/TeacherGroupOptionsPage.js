import { MetaTags } from '@redwoodjs/web'

import TeacherGroupActionsCell from 'src/components/TeacherGroupActionsCell/TeacherGroupActionsCell'
import TeacherGroupRewardsCell from 'src/components/TeacherGroupRewardsCell/TeacherGroupRewardsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      <TeacherLayout groupId={id}></TeacherLayout>
      <TeacherGroupActionsCell id={id} />
      <TeacherGroupRewardsCell id={id} />
    </>
  )
}

export default TeacherGroupOptionsPage

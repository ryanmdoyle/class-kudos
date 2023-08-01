import { MetaTags } from '@redwoodjs/web'

import TeacherGroupActionsCell from 'src/components/TeacherGroupActionsCell/TeacherGroupActionsCell'
import TeacherGroupArchive from 'src/components/TeacherGroupArchive/TeacherGroupArchive'
import TeacherGroupEnrolleesCell from 'src/components/TeacherGroupEnrolleesCell/TeacherGroupEnrolleesCell'
import TeacherGroupRewardsCell from 'src/components/TeacherGroupRewardsCell/TeacherGroupRewardsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupOptionsPage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupOptions" description="GroupOptions page" />
      <TeacherLayout groupId={id}>
        <div className="h-full w-full overflow-y-scroll py-4">
          <TeacherGroupActionsCell id={id} />
          <TeacherGroupRewardsCell id={id} />
          <TeacherGroupEnrolleesCell id={id} />
          <TeacherGroupArchive id={id} />
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupOptionsPage

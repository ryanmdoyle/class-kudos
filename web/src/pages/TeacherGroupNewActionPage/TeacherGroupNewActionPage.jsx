import { MetaTags } from '@redwoodjs/web'

import TeacherGroupNewAction from 'src/components/TeacherGroupNewAction/TeacherGroupNewAction'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupNewActionPage = ({ id }) => {
  return (
    <>
      <MetaTags
        title="TeacherGroupNewAction"
        description="TeacherGroupNewAction page"
      />
      <TeacherLayout groupId={id}>
        <TeacherGroupNewAction groupId={id} />
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupNewActionPage

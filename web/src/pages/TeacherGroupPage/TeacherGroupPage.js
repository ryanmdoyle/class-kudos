import { MetaTags } from '@redwoodjs/web'

import GroupPageHeaderCell from 'src/components/GroupPageHeaderCell/GroupPageHeaderCell'
import TeacherGroupLayout from 'src/layouts/TeacherGroupsLayout/TeacherGroupsLayout'

const TeacherGroupPage = ({ id }) => {
  return (
    <>
      <MetaTags title="TeacherGroup" description="TeacherGroup page" />

      <TeacherGroupLayout groupId={id}>
        <GroupPageHeaderCell id={id} />
      </TeacherGroupLayout>
    </>
  )
}

export default TeacherGroupPage

import { MetaTags } from '@redwoodjs/web'

import EnrolledStudentsCell from 'src/components/EnrolledStudentsCell/EnrolledStudentsCell'
import TeacherGroupHeaderCell from 'src/components/TeacherGroupHeaderCell/TeacherGroupHeaderCell'
// import EnrolledStudentActivityLayout from 'src/layouts/EnrolledStudentActivityLayout/EnrolledStudentActivityLayout'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupPage = ({ id }) => {
  return (
    <>
      <MetaTags title="TeacherGroup" description="TeacherGroup page" />

      <TeacherLayout groupId={id}>
        <TeacherGroupHeaderCell id={id} />
        <div className="flex gap-4 w-[100%] h-[60%]">
          <div className="w-1/3">
            <EnrolledStudentsCell id={id} />
          </div>
          <div className="w-2/3 nes-container">
            {`<- Select a student to get started.`}
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupPage

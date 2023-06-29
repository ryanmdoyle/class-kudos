import { MetaTags } from '@redwoodjs/web'

import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupPage = ({ id }) => {
  return (
    <>
      <MetaTags title="TeacherGroup" description="TeacherGroup page" />

      <TeacherLayout groupId={id}>
        <div className="flex gap-4 w-[100%] h-[60%]">
          <div className="w-1/3">
            <TeacherGroupEnrolledCell id={id} />
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

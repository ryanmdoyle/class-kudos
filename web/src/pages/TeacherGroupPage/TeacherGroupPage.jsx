import { MetaTags } from '@redwoodjs/web'

import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupPage = ({ id }) => {
  return (
    <>
      <MetaTags
        title="Group Dashboard - Class Kudos"
        description="Group page"
      />

      <TeacherLayout groupId={id}>
        <div className="flex h-full w-[100%] gap-4">
          <div className="w-1/3">
            <TeacherGroupEnrolledCell id={id} />
          </div>
          <div className="nes-container w-2/3">
            {`<- Select a student to get started.`}
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupPage

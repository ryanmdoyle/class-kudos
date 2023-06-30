import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherGroupFeedbackButtonsCell from 'src/components/TeacherGroupFeedbackButtonsCell/TeacherGroupFeedbackButtonsCell'
import TeacherGroupStudentRecentFeedbackCell from 'src/components/TeacherGroupStudentRecentFeedbackCell/TeacherGroupStudentRecentFeedbackCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStudentPage = ({ id, studentId }) => {
  return (
    <>
      <MetaTags
        title="TeacherGroupStudent"
        description="TeacherGroupStudent page"
      />

      <TeacherLayout groupId={id}>
        <div className="flex gap-4 w-[100%] h-[60%]">
          <div className="w-1/3">
            <TeacherGroupEnrolledCell id={id} />
          </div>
          <div className="flex flex-col gap-4 w-2/3">
            <TeacherGroupFeedbackButtonsCell id={id} studentId={studentId} />
            {/* <TeacherGroupStudentRecentFeedbackCell
              groupId={id}
              userId={studentId}
              take={10}
            /> */}
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStudentPage

import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherGroupFeedbackButtonsCell from 'src/components/TeacherGroupFeedbackButtonsCell/TeacherGroupFeedbackButtonsCell'
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
            <div className="nes-container with-title h-1/2">
              <span className="title relative -top-2">
                Recent Feedback Cell
              </span>
              {`Student Id is: ${studentId}`}
            </div>
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStudentPage

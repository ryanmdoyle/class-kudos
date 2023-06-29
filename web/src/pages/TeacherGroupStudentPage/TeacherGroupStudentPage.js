import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import EnrolledStudentsCell from 'src/components/EnrolledStudentsCell/EnrolledStudentsCell'
import TeacherGroupHeaderCell from 'src/components/TeacherGroupHeaderCell/TeacherGroupHeaderCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStudentPage = ({ id, studentId }) => {
  return (
    <>
      <MetaTags
        title="TeacherGroupStudent"
        description="TeacherGroupStudent page"
      />

      <TeacherLayout groupId={id}>
        <TeacherGroupHeaderCell id={id} />
        <div className="flex gap-4 w-[100%] h-[60%]">
          <div className="w-1/3">
            <EnrolledStudentsCell id={id} />
          </div>
          <div className="flex flex-col gap-4 w-2/3">
            <div className="nes-container with-title h-1/2">
              <span className="title relative -top-2">Give Feedback</span>
              {`Student Id is: ${studentId}`}
            </div>
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

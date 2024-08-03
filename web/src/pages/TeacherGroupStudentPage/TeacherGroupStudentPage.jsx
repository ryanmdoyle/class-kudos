import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherGroupFeedbackButtonsCell from 'src/components/TeacherGroupFeedbackButtonsCell/TeacherGroupFeedbackButtonsCell'
import TeacherGroupStudentRecentFeedbackCell from 'src/components/TeacherGroupStudentRecentFeedbackCell/TeacherGroupStudentRecentFeedbackCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStudentPage = ({ id, studentId }) => {
  return (
    <>
      <TeacherLayout groupId={id}>
        <div className="flex h-full w-[100%] gap-4">
          <div className="w-1/3">
            <TeacherGroupEnrolledCell id={id} />
          </div>
          <div className="flex w-2/3 flex-col gap-4">
            <TeacherGroupFeedbackButtonsCell id={id} studentId={studentId} />
            <TeacherGroupStudentRecentFeedbackCell
              groupId={id}
              userId={studentId}
              take={10}
            />
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStudentPage

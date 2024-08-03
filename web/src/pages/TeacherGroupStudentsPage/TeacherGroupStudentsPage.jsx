import { SelectedEnrolledProvider } from 'src/components/Context/SelectedEnrolledContext'
import TeacherGroupEnrolledCell from 'src/components/TeacherGroupEnrolledCell/TeacherGroupEnrolledCell'
import TeacherGroupFeedbacksButtonsCell from 'src/components/TeacherGroupFeedbacksButtonsCell/TeacherGroupFeedbacksButtonsCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStudentsPage = ({ id }) => {
  return (
    <SelectedEnrolledProvider>
      <TeacherLayout groupId={id}>
        <div className="flex h-full w-[100%] gap-4">
          <div className="w-1/3">
            <TeacherGroupEnrolledCell id={id} />
          </div>
          <div className="flex w-2/3 flex-col gap-4">
            <TeacherGroupFeedbacksButtonsCell id={id} />
          </div>
        </div>
      </TeacherLayout>
    </SelectedEnrolledProvider>
  )
}

export default TeacherGroupStudentsPage

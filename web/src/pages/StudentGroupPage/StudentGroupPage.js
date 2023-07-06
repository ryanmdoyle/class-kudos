import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import StudentGroupRecentFeedbackCell from 'src/components/StudentGroupRecentFeedbackCell/StudentGroupRecentFeedbackCell'
import StudentLayout from 'src/layouts/StudentLayout/StudentLayout'

const StudentGroupPage = ({ id }) => {
  const { currentUser } = useAuth()

  return (
    <>
      <MetaTags title="StudentGroup" description="StudentGroup page" />
      <StudentLayout groupId={id}>
        {currentUser?.id && (
          <div className="h-full w-full">
            <StudentGroupRecentFeedbackCell
              userId={currentUser?.id}
              groupId={id}
              take={20}
            />
          </div>
        )}
      </StudentLayout>
    </>
  )
}

export default StudentGroupPage

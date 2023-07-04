import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import StudentGroupRecentFeedbackCell from 'src/components/StudentGroupRecentFeedbackCell/StudentGroupRecentFeedbackCell'
import StudentGroupRewardsCell from 'src/components/StudentGroupRewardsCell/StudentGroupRewardsCell'
import StudentLayout from 'src/layouts/StudentLayout/StudentLayout'

const StudentGroupPage = ({ id }) => {
  const { currentUser } = useAuth()

  return (
    <>
      <MetaTags title="StudentGroup" description="StudentGroup page" />
      <StudentLayout groupId={id}>
        {currentUser?.id && (
          <div className="h-full w-full overflow-y-scroll grid grid-rows-2 grid-cols-1 gap-2">
            <StudentGroupRewardsCell userId={currentUser?.id} groupId={id} />
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

import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import StudentGroupRecentRedeemedCell from 'src/components/StudentGroupRecentRedeemedCell/StudentGroupRecentRedeemedCell'
import StudentGroupRewardsCell from 'src/components/StudentGroupRewardsCell/StudentGroupRewardsCell'
import StudentLayout from 'src/layouts/StudentLayout/StudentLayout'

const StudentGroupRewardsPage = ({ id }) => {
  const { currentUser } = useAuth()
  return (
    <>
      <MetaTags
        title="StudentGroupRewards"
        description="StudentGroupRewards page"
      />

      <StudentLayout groupId={id}>
        {currentUser?.id && (
          <div className="h-full w-full overflow-y-scroll grid grid-cols-3 grid-rows-1 gap-2">
            <StudentGroupRewardsCell userId={currentUser?.id} groupId={id} />
            <StudentGroupRecentRedeemedCell
              input={{ userId: currentUser?.id, groupId: id }}
            />
          </div>
        )}
      </StudentLayout>
    </>
  )
}

export default StudentGroupRewardsPage

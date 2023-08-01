import { MetaTags } from '@redwoodjs/web'

import TeacherGroupNewReward from 'src/components/TeacherGroupNewReward/TeacherGroupNewReward'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupNewRewardPage = ({ id }) => {
  return (
    <>
      <MetaTags title="New Reward" description="New Reward page" />
      <TeacherLayout groupId={id}>
        <TeacherGroupNewReward groupId={id} />
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupNewRewardPage

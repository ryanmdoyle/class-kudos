import { MetaTags } from '@redwoodjs/web'

import TeacherGroupNewReward from 'src/components/TeacherGroupNewReward/TeacherGroupNewReward'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupNewRewardPage = ({ id }) => {
  return (
    <>
      <MetaTags
        title="TeacherGroupNewReward"
        description="TeacherGroupNewReward page"
      />
      <TeacherLayout groupId={id}>
        <TeacherGroupNewReward groupId={id} />
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupNewRewardPage

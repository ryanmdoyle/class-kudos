import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStorePage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupStore" description="GroupStore page" />
      <TeacherLayout groupId={id}>
        <div className="h-full nes-container"></div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStorePage

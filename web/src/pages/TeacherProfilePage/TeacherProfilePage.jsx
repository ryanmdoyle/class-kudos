import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import EditTeacherProfileCell from 'src/components/EditTeacherProfileCell/EditTeacherProfileCell'

const TeacherProfilePage = () => {
  const { currentUser } = useAuth()
  return (
    <>
      <Metadata title="TeacherProfile" description="TeacherProfile page" />
      <div className="flex justify-center">
        <Link to={routes.teacher()} className="nes-btn">
          {`Home`}
        </Link>
      </div>
      <div className="m-auto max-w-screen-lg pt-4">
        {currentUser && <EditTeacherProfileCell id={currentUser.id} />}
      </div>
    </>
  )
}

export default TeacherProfilePage

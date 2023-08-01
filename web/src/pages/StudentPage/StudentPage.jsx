import { routes, navigate } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import GroupsEnrolledCell from 'src/components/GroupsEnrolledCell/GroupsEnrolledCell'

const StudentPage = () => {
  const { currentUser } = useAuth()

  const addEnrollment = () => navigate(routes.studentNewEnrollment())

  return (
    <>
      <MetaTags title="Student Home" description="Student Home" />
      <div className="w-full">
        <h1 className="my-6 text-xl">
          {currentUser?.firstName
            ? `Welcome, ${currentUser.firstName}!`
            : 'Welcome!'}
        </h1>
        <div className="flex flex-col justify-between px-4 sm:flex-row">
          <div className="sm:w-1/2">
            {currentUser?.id ? (
              <GroupsEnrolledCell userId={currentUser?.id} />
            ) : null}
            <button
              className="nes-btn is-success place-self-end"
              onClick={addEnrollment}
            >
              Add Group
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default StudentPage

import { routes, navigate } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import GroupsEnrolledCell from 'src/components/GroupsEnrolledCell'

const StudentPage = () => {
  const { currentUser } = useAuth()

  const addEnrollment = () => navigate(routes.studentNewEnrollment())

  return (
    <>
      <MetaTags title="Student" description="Student Home" />
      <div className="w-full">
        <h1 className="text-xl my-6">
          {currentUser?.firstName
            ? `Welcome, ${currentUser.firstName}!`
            : 'Welcome!'}
        </h1>
        <div className="px-4 flex flex-col sm:flex-row justify-between">
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

import { Link, routes, navigate } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import GroupsOwnedCell from 'src/components/GroupsOwnedCell'

const TeacherPage = () => {
  const { currentUser } = useAuth()

  const addGroup = () => navigate(routes.teacherNewGroup())

  return (
    <>
      <MetaTags title="Teacher" description="Teacher Home" />
      <div className="w-full">
        <h1 className="text-xl my-6">
          {currentUser?.firstName
            ? `Welcome, ${currentUser.firstName}!`
            : 'Welcome!'}
        </h1>
        <div className="px-4 flex flex-col sm:flex-row justify-between">
          <div className="sm:w-1/2">
            {currentUser?.id ? (
              <GroupsOwnedCell ownerId={currentUser?.id} />
            ) : null}
            <button
              className="nes-btn is-success place-self-end"
              onClick={addGroup}
            >
              Add Group
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default TeacherPage

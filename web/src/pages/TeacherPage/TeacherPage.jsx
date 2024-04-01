import { routes, navigate } from '@redwoodjs/router'
import { Head } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import GroupsOwnedCell from 'src/components/GroupsOwnedCell'

const TeacherPage = () => {
  const { currentUser } = useAuth()

  const addGroup = () => navigate(routes.teacherNewGroup())

  return (
    <>
      <Head>
        <title>Teacher Groups</title>
      </Head>
      <div className="container m-auto pt-6 lg:w-1/2">
        <h1 className="my-6 text-xl">
          {currentUser?.firstName
            ? `Welcome, ${currentUser.firstName}!`
            : 'Welcome!'}
        </h1>
        <div className="flex flex-col justify-between px-4 sm:flex-row">
          <div className="sm:w-1/2">
            {currentUser?.id ? (
              <GroupsOwnedCell ownerId={currentUser?.id} />
            ) : null}
            <button
              className="nes-btn is-success absolute bottom-4 right-4 place-self-end"
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

import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

const TeacherPage = () => {
  const { currentUser } = useAuth()

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
          <div className="mb-6 sm:w-1/2">
            <p>Select a group to start awarding kudos!</p>
          </div>
          <div className="sm:w-1/2">
            <ul className="nes-list is-disc mb-6 pl-4">
              <li className="mb-2">Group 1</li>
              <li className="mb-2">Group 2</li>
              <li className="mb-2">Group 3</li>
              <li className="mb-2">Group 4</li>
            </ul>
            <button className="nes-btn is-success place-self-end">
              Add Group
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default TeacherPage

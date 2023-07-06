import { MetaTags } from '@redwoodjs/web'

import TeacherGroupStoreApprovedCell from 'src/components/TeacherGroupStoreApprovedCell/TeacherGroupStoreApprovedCell'
import TeacherGroupStoreRequestedCell from 'src/components/TeacherGroupStoreRequestedCell/TeacherGroupStoreRequestedCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStorePage = ({ id }) => {
  return (
    <>
      <MetaTags title="GroupStore" description="GroupStore page" />
      <TeacherLayout groupId={id}>
        <div className="h-full w-full grid grid-rows-2 grid-cols-1 gap-4">
          <div className="nes-container with-title col-span-1 row-span-1">
            <p className="title relative -top-2">Requested</p>
            <TeacherGroupStoreRequestedCell groupId={id} />
          </div>
          <div className="nes-container with-title col-span-1 row-span-1">
            <p className="title relative -top-2">[Approved]</p>
            <TeacherGroupStoreApprovedCell groupId={id} />
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStorePage

import { MetaTags } from '@redwoodjs/web'

import TeacherGroupStoreApprovedCell from 'src/components/TeacherGroupStoreApprovedCell/TeacherGroupStoreApprovedCell'
import TeacherGroupStoreRequestedCell from 'src/components/TeacherGroupStoreRequestedCell/TeacherGroupStoreRequestedCell'
import TeacherLayout from 'src/layouts/TeacherLayout/TeacherLayout'

const TeacherGroupStorePage = ({ id }) => {
  return (
    <>
      <MetaTags
        title="Group Store - Class Kudos"
        description="Group Store page"
      />
      <TeacherLayout groupId={id}>
        <div className="grid h-full w-full grid-cols-1 grid-rows-2 gap-4">
          <div className="nes-container with-title col-span-1 row-span-1">
            <p className="title relative -top-2">Requested</p>
            <TeacherGroupStoreRequestedCell groupId={id} />
          </div>
          <div className="nes-container with-title col-span-1 row-span-1">
            <p className="title relative -top-2">Approved</p>
            <TeacherGroupStoreApprovedCell groupId={id} />
          </div>
        </div>
      </TeacherLayout>
    </>
  )
}

export default TeacherGroupStorePage

import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import EditEnrolledUserCell from 'src/components/EditEnrolledUserCell/EditEnrolledUserCell'

const TeacherEditEnrolledUserPage = ({ groupId, userId }) => {
  return (
    <>
      <Metadata title="Edit User" description="Edit User Page" />
      <Link to={routes.teacherGroupOptions({ id: groupId })}>
        <button className="rw-button rw-button-blue mb-6">{`<-- Return to Options Page`}</button>
      </Link>
      <EditEnrolledUserCell id={userId} groupId={groupId} />
    </>
  )
}

export default TeacherEditEnrolledUserPage

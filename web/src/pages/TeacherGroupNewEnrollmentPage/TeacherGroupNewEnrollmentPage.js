import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

const TeacherGroupNewEnrollmentPage = () => {
  return (
    <>
      <MetaTags
        title="TeacherGroupNewEnrollment"
        description="TeacherGroupNewEnrollment page"
      />

      <h1>TeacherGroupNewEnrollmentPage</h1>
      <p>
        Find me in{' '}
        <code>
          ./web/src/pages/TeacherGroupNewEnrollmentPage/TeacherGroupNewEnrollmentPage.js
        </code>
      </p>
      <p>
        My default route is named <code>teacherGroupNewEnrollment</code>, link
        to me with `
        <Link to={routes.teacherGroupNewEnrollment()}>
          TeacherGroupNewEnrollment
        </Link>
        `
      </p>
    </>
  )
}

export default TeacherGroupNewEnrollmentPage

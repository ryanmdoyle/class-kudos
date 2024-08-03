import { NavLink, routes } from '@redwoodjs/router'

const TeacherGroupEnrolledListLink = ({ enrollment }) => {
  return (
    <NavLink
      className="nes-text"
      activeClassName="nes-text is-primary"
      key={enrollment.id}
      to={routes.teacherGroupStudent({
        id: enrollment.groupId,
        studentId: enrollment.userId,
      })}
    >
      <li className="mb-3 flex justify-between">
        <p className="inline-block">
          {enrollment.user.firstName} {enrollment.user.lastName}
        </p>
        <p className="mr-2 inline-block">{enrollment.points}</p>
      </li>
    </NavLink>
  )
}

export default TeacherGroupEnrolledListLink

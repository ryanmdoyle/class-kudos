// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Set, Router, Route } from '@redwoodjs/router'

import ScaffoldLayout from 'src/layouts/ScaffoldLayout'

import { useAuth } from './auth'
import MainLayout from './layouts/MainLayout/MainLayout'

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      <Set wrap={ScaffoldLayout} title="Redeemeds" titleTo="redeemeds" buttonLabel="New Redeemed" buttonTo="newRedeemed">
        <Route path="/redeemeds/new" page={RedeemedNewRedeemedPage} name="newRedeemed" />
        <Route path="/redeemeds/{id}/edit" page={RedeemedEditRedeemedPage} name="editRedeemed" />
        <Route path="/redeemeds/{id}" page={RedeemedRedeemedPage} name="redeemed" />
        <Route path="/redeemeds" page={RedeemedRedeemedsPage} name="redeemeds" />
      </Set>
      <Set wrap={ScaffoldLayout} title="Rewards" titleTo="rewards" buttonLabel="New Reward" buttonTo="newReward">
        <Route path="/rewards/new" page={RewardNewRewardPage} name="newReward" />
        <Route path="/rewards/{id}/edit" page={RewardEditRewardPage} name="editReward" />
        <Route path="/rewards/{id}" page={RewardRewardPage} name="reward" />
        <Route path="/rewards" page={RewardRewardsPage} name="rewards" />
      </Set>
      <Set wrap={ScaffoldLayout} title="Feedbacks" titleTo="feedbacks" buttonLabel="New Feedback" buttonTo="newFeedback">
        <Route path="/feedbacks/new" page={FeedbackNewFeedbackPage} name="newFeedback" />
        <Route path="/feedbacks/{id}/edit" page={FeedbackEditFeedbackPage} name="editFeedback" />
        <Route path="/feedbacks/{id}" page={FeedbackFeedbackPage} name="feedback" />
        <Route path="/feedbacks" page={FeedbackFeedbacksPage} name="feedbacks" />
      </Set>
      <Set wrap={MainLayout}>
        <Route path="/teacher" page={TeacherPage} name="teacher" />
        <Route path="/student" page={StudentPage} name="student" />
        <Route path="/student/new-enrollment" page={StudentNewEnrollmentPage} name="studentNewEnrollment" />
        <Route path="/student/group/{id}" page={StudentGroupPage} name="studentGroup" />
        <Route path="/student/group/awards/{id}" page={StudentGroupRewardsPage} name="studentGroupRewards" />
        <Route path="/" page={HomePage} name="home" />
        <Route path="/login" page={LoginPage} name="login" />
        <Route path="/signup" page={SignupPage} name="signup" />
        <Route path="/forgot-password" page={ForgotPasswordPage} name="forgotPassword" />
        <Route path="/reset-password" page={ResetPasswordPage} name="resetPassword" />
        <Route path="/groups/new" page={GroupNewGroupPage} name="newGroup" />
        <Route path="/teacher/group/new" page={TeacherNewGroupPage} name="teacherNewGroup" />
        <Route path="/teacher/group/{id}" page={TeacherGroupPage} name="teacherGroup" />
        <Route path="/teacher/group/{id}/student/{studentId}" page={TeacherGroupStudentPage} name="teacherGroupStudent" />
        <Route path="/teacher/group/{id}/action/new" page={TeacherGroupNewActionPage} name="teacherGroupNewAction" />
        <Route path="/teacher/group/{id}/reward/new" page={TeacherGroupNewRewardPage} name="teacherGroupNewReward" />
        <Route path="/teacher/store/{id}" page={TeacherGroupStorePage} name="teacherGroupStore" />
        <Route path="/teacher/options/{id}" page={TeacherGroupOptionsPage} name="teacherGroupOptions" />
        <Route notfound page={NotFoundPage} />
      </Set>
      {/* the group models use the scaffolds for frontend.  Make copies, so the scaffolds are only used for admin. */}
      <Set wrap={MainLayout} title="Groups" titleTo="groups" buttonLabel="New Group" buttonTo="newGroup">
        <Route path="/groups/{id}/edit" page={GroupEditGroupPage} name="editGroup" />
        <Route path="/groups/{id}" page={GroupGroupPage} name="group" />
        <Route path="/groups" page={GroupGroupsPage} name="groups" />
      </Set>
      <Set wrap={ScaffoldLayout} title="UserRoles" titleTo="userRoles" buttonLabel="New UserRole" buttonTo="newUserRole">
        <Route path="/user-roles/new" page={UserRoleNewUserRolePage} name="newUserRole" />
        <Route path="/user-roles/{id}/edit" page={UserRoleEditUserRolePage} name="editUserRole" />
        <Route path="/user-roles/{id}" page={UserRoleUserRolePage} name="userRole" />
        <Route path="/user-roles" page={UserRoleUserRolesPage} name="userRoles" />
      </Set>
      <Set wrap={ScaffoldLayout} title="Users" titleTo="users" buttonLabel="New User" buttonTo="newUser">
        <Route path="/users/new" page={UserNewUserPage} name="newUser" />
        <Route path="/users/{id}/edit" page={UserEditUserPage} name="editUser" />
        <Route path="/users/{id}" page={UserUserPage} name="user" />
        <Route path="/users" page={UserUsersPage} name="users" />
      </Set>
      <Set wrap={ScaffoldLayout} title="Actions" titleTo="actions" buttonLabel="New Action" buttonTo="newAction">
        <Route path="/actions/new" page={ActionNewActionPage} name="newAction" />
        <Route path="/actions/{id}/edit" page={ActionEditActionPage} name="editAction" />
        <Route path="/actions/{id}" page={ActionActionPage} name="action" />
        <Route path="/actions" page={ActionActionsPage} name="actions" />
      </Set>
      <Set wrap={ScaffoldLayout} title="Enrollments" titleTo="enrollments" buttonLabel="New Enrollment" buttonTo="newEnrollment">
        <Route path="/enrollments/new" page={EnrollmentNewEnrollmentPage} name="newEnrollment" />
        <Route path="/enrollments/{id}/edit" page={EnrollmentEditEnrollmentPage} name="editEnrollment" />
        <Route path="/enrollments/{id}" page={EnrollmentEnrollmentPage} name="enrollment" />
        <Route path="/enrollments" page={EnrollmentEnrollmentsPage} name="enrollments" />
      </Set>
    </Router>
  )
}

export default Routes

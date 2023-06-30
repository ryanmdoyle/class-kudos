// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupStudentRecentFeedbackList {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupStudentRecentFeedbackList from './TeacherGroupStudentRecentFeedbackList'

export const generated = () => {
  return <TeacherGroupStudentRecentFeedbackList />
}

export default {
  title: 'Components/TeacherGroupStudentRecentFeedbackList',
  component: TeacherGroupStudentRecentFeedbackList,
}

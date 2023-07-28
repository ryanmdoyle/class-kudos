// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupEnrolleesList {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupEnrolleesList from './TeacherGroupEnrolleesList'

export const generated = () => {
  return <TeacherGroupEnrolleesList />
}

export default {
  title: 'Components/TeacherGroupEnrolleesList',
  component: TeacherGroupEnrolleesList,
}

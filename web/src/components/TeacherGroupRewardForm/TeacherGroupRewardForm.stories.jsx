// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupRewardForm {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupRewardForm from './TeacherGroupRewardForm'

export const generated = () => {
  return <TeacherGroupRewardForm />
}

export default {
  title: 'Components/TeacherGroupRewardForm',
  component: TeacherGroupRewardForm,
}

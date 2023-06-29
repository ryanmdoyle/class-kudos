// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherNewGroup {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherNewGroup from './TeacherNewGroup'

export const generated = () => {
  return <TeacherNewGroup />
}

export default {
  title: 'Components/TeacherNewGroup',
  component: TeacherNewGroup,
}

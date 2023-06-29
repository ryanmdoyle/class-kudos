// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherNewGroupForm {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherNewGroupForm from './TeacherNewGroupForm'

export const generated = () => {
  return <TeacherNewGroupForm />
}

export default {
  title: 'Components/TeacherNewGroupForm',
  component: TeacherNewGroupForm,
}

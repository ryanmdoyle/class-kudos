// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupActionForm {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupActionForm from './TeacherGroupActionForm'

export const generated = () => {
  return <TeacherGroupActionForm />
}

export default {
  title: 'Components/TeacherGroupActionForm',
  component: TeacherGroupActionForm,
}

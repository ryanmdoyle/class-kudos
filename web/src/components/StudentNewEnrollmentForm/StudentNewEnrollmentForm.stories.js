// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <StudentNewEnrollmentForm {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import StudentNewEnrollmentForm from './StudentNewEnrollmentForm'

export const generated = () => {
  return <StudentNewEnrollmentForm />
}

export default {
  title: 'Components/StudentNewEnrollmentForm',
  component: StudentNewEnrollmentForm,
}

// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupStoreRequestedList {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupStoreRequestedList from './TeacherGroupStoreRequestedList'

export const generated = () => {
  return <TeacherGroupStoreRequestedList />
}

export default {
  title: 'Components/TeacherGroupStoreRequestedList',
  component: TeacherGroupStoreRequestedList,
}

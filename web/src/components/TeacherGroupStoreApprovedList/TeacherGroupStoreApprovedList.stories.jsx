// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TeacherGroupStoreApprovedList {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import TeacherGroupStoreApprovedList from './TeacherGroupStoreApprovedList'

export const generated = () => {
  return <TeacherGroupStoreApprovedList />
}

export default {
  title: 'Components/TeacherGroupStoreApprovedList',
  component: TeacherGroupStoreApprovedList,
}

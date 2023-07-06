// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <StudentGroupRecentRedeemedList {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import StudentGroupRecentRedeemedList from './StudentGroupRecentRedeemedList'

export const generated = () => {
  return <StudentGroupRecentRedeemedList />
}

export default {
  title: 'Components/StudentGroupRecentRedeemedList',
  component: StudentGroupRecentRedeemedList,
}

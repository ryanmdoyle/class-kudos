import { render } from '@redwoodjs/testing/web'

import TeacherGroupsLayout from './TeacherGroupsLayout'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupsLayout', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupsLayout />)
    }).not.toThrow()
  })
})

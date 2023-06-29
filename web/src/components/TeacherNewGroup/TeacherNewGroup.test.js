import { render } from '@redwoodjs/testing/web'

import TeacherNewGroup from './TeacherNewGroup'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherNewGroup', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherNewGroup />)
    }).not.toThrow()
  })
})

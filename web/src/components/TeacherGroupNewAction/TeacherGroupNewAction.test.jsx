import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewAction from './TeacherGroupNewAction'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupNewAction', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewAction />)
    }).not.toThrow()
  })
})

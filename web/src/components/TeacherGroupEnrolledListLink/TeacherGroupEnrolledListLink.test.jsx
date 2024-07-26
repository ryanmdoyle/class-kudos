import { render } from '@redwoodjs/testing/web'

import TeacherGroupEnrolledListLink from './TeacherGroupEnrolledListLink'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupEnrolledListLink', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupEnrolledListLink />)
    }).not.toThrow()
  })
})

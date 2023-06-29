import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewActionPage from './TeacherGroupNewActionPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupNewActionPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewActionPage />)
    }).not.toThrow()
  })
})

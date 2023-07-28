import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewEnrollmentPage from './TeacherGroupNewEnrollmentPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupNewEnrollmentPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewEnrollmentPage />)
    }).not.toThrow()
  })
})

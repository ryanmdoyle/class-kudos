import { render } from '@redwoodjs/testing/web'

import TeacherEditEnrolledUserPage from './TeacherEditEnrolledUserPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherEditEnrolledUserPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherEditEnrolledUserPage />)
    }).not.toThrow()
  })
})

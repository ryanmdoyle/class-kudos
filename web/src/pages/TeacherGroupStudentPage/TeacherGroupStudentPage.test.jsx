import { render } from '@redwoodjs/testing/web'

import TeacherGroupStudentPage from './TeacherGroupStudentPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupStudentPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupStudentPage />)
    }).not.toThrow()
  })
})

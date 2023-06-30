import { render } from '@redwoodjs/testing/web'

import TeacherGroupStudentRecentFeedbackList from './TeacherGroupStudentRecentFeedbackList'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupStudentRecentFeedbackList', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupStudentRecentFeedbackList />)
    }).not.toThrow()
  })
})

import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewEnrollmentForm from './TeacherGroupNewEnrollmentForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupNewEnrollmentForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewEnrollmentForm />)
    }).not.toThrow()
  })
})

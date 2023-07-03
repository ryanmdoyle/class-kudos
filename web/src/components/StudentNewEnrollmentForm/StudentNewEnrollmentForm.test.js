import { render } from '@redwoodjs/testing/web'

import StudentNewEnrollmentForm from './StudentNewEnrollmentForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('StudentNewEnrollmentForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentNewEnrollmentForm />)
    }).not.toThrow()
  })
})

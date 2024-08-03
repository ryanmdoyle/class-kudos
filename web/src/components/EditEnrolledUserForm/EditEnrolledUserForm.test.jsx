import { render } from '@redwoodjs/testing/web'

import EditEnrolledUserForm from './EditEnrolledUserForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('EditEnrolledUserForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<EditEnrolledUserForm />)
    }).not.toThrow()
  })
})

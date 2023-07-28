import { render } from '@redwoodjs/testing/web'

import StudentNewEnrollmentPage from './StudentNewEnrollmentPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('StudentNewEnrollmentPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentNewEnrollmentPage />)
    }).not.toThrow()
  })
})

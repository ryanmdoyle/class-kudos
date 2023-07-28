import { render } from '@redwoodjs/testing/web'

import StudentPage from './StudentPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('StudentPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentPage />)
    }).not.toThrow()
  })
})

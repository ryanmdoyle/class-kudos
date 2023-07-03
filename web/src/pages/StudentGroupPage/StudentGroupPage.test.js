import { render } from '@redwoodjs/testing/web'

import StudentGroupPage from './StudentGroupPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('StudentGroupPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentGroupPage />)
    }).not.toThrow()
  })
})

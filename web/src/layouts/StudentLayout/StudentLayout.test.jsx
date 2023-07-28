import { render } from '@redwoodjs/testing/web'

import StudentLayout from './StudentLayout'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('StudentLayout', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentLayout />)
    }).not.toThrow()
  })
})

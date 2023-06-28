import { render } from '@redwoodjs/testing/web'

import GroupOptionsPage from './GroupOptionsPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GroupOptionsPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GroupOptionsPage />)
    }).not.toThrow()
  })
})

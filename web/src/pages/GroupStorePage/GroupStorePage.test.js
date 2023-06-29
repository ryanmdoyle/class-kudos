import { render } from '@redwoodjs/testing/web'

import GroupStorePage from './GroupStorePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GroupStorePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GroupStorePage />)
    }).not.toThrow()
  })
})

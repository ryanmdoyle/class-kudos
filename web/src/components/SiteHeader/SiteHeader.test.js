import { render } from '@redwoodjs/testing/web'

import SiteHeader from './SiteHeader'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('SiteHeader', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<SiteHeader />)
    }).not.toThrow()
  })
})

import { render } from '@redwoodjs/testing/web'

import StudentGroupRewardsPage from './StudentGroupRewardsPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('StudentGroupRewardsPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentGroupRewardsPage />)
    }).not.toThrow()
  })
})

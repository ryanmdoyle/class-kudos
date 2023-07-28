import { render } from '@redwoodjs/testing/web'

import StudentGroupRecentRedeemedList from './StudentGroupRecentRedeemedList'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('StudentGroupRecentRedeemedList', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StudentGroupRecentRedeemedList />)
    }).not.toThrow()
  })
})

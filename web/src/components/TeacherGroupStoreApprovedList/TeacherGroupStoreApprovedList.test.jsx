import { render } from '@redwoodjs/testing/web'

import TeacherGroupStoreApprovedList from './TeacherGroupStoreApprovedList'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupStoreApprovedList', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupStoreApprovedList />)
    }).not.toThrow()
  })
})

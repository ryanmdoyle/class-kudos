import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewReward from './TeacherGroupNewReward'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupNewReward', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewReward />)
    }).not.toThrow()
  })
})

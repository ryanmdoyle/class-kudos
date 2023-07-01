import { render } from '@redwoodjs/testing/web'

import TeacherGroupNewRewardPage from './TeacherGroupNewRewardPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupNewRewardPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupNewRewardPage />)
    }).not.toThrow()
  })
})

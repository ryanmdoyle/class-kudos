import { render } from '@redwoodjs/testing/web'

import TeacherGroupRewardForm from './TeacherGroupRewardForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupRewardForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupRewardForm />)
    }).not.toThrow()
  })
})

import { render } from '@redwoodjs/testing/web'

import TeacherProfileForm from './TeacherProfileForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherProfileForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherProfileForm />)
    }).not.toThrow()
  })
})

import { render } from '@redwoodjs/testing/web'

import TeacherNewGroupForm from './TeacherNewGroupForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherNewGroupForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherNewGroupForm />)
    }).not.toThrow()
  })
})

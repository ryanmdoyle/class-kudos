import { render } from '@redwoodjs/testing/web'

import TeacherGroupActionForm from './TeacherGroupActionForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupActionForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupActionForm />)
    }).not.toThrow()
  })
})

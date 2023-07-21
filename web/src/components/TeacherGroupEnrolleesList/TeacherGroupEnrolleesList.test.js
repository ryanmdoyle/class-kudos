import { render } from '@redwoodjs/testing/web'

import TeacherGroupEnrolleesList from './TeacherGroupEnrolleesList'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupEnrolleesList', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupEnrolleesList />)
    }).not.toThrow()
  })
})

import { render } from '@redwoodjs/testing/web'

import TeacherGroupStoreRequestedList from './TeacherGroupStoreRequestedList'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupStoreRequestedList', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupStoreRequestedList />)
    }).not.toThrow()
  })
})

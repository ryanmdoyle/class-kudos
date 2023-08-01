import { render } from '@redwoodjs/testing/web'

import TeacherGroupArchive from './TeacherGroupArchive'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TeacherGroupArchive', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupArchive />)
    }).not.toThrow()
  })
})

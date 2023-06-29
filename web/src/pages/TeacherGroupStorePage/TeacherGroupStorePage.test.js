import { render } from '@redwoodjs/testing/web'

import TeacherGroupStorePage from './TeacherGroupStorePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupStorePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupStorePage />)
    }).not.toThrow()
  })
})

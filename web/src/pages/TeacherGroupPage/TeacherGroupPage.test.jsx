import { render } from '@redwoodjs/testing/web'

import TeacherGroupPage from './TeacherGroupPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupPage />)
    }).not.toThrow()
  })
})

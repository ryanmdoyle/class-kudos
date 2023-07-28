import { render } from '@redwoodjs/testing/web'

import TeacherGroupOptionsPage from './TeacherGroupOptionsPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherGroupOptionsPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherGroupOptionsPage />)
    }).not.toThrow()
  })
})

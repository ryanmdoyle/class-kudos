import { render } from '@redwoodjs/testing/web'

import TeacherProfilePage from './TeacherProfilePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherProfilePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherProfilePage />)
    }).not.toThrow()
  })
})

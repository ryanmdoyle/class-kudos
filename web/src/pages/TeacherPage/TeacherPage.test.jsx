import { render } from '@redwoodjs/testing/web'

import TeacherPage from './TeacherPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherPage />)
    }).not.toThrow()
  })
})

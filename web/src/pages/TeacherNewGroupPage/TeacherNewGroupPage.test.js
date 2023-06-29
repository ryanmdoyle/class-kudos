import { render } from '@redwoodjs/testing/web'

import TeacherNewGroupPage from './TeacherNewGroupPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TeacherNewGroupPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TeacherNewGroupPage />)
    }).not.toThrow()
  })
})

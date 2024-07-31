import { render } from '@redwoodjs/testing/web'

import GroupNameForm from './GroupNameForm'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('GroupNameForm', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GroupNameForm />)
    }).not.toThrow()
  })
})

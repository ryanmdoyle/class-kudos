import {
  Loading,
  Empty,
  Failure,
  Success,
} from './StudentGroupRecentRedeemedCell'
import { standard } from './StudentGroupRecentRedeemedCell.mock'

export const loading = () => {
  return Loading ? <Loading /> : <></>
}

export const empty = () => {
  return Empty ? <Empty /> : <></>
}

export const failure = (args) => {
  return Failure ? <Failure error={new Error('Oh no')} {...args} /> : <></>
}

export const success = (args) => {
  return Success ? <Success {...standard()} {...args} /> : <></>
}

export default { title: 'Cells/StudentGroupRecentRedeemedCell' }

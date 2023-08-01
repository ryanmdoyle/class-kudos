import { Link, navigate, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import TeacherNewGroupForm from 'src/components/TeacherNewGroupForm/TeacherNewGroupForm'

const CREATE_GROUP_MUTATION = gql`
  mutation CreateGroupMutation($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
    }
  }
`

const TeacherNewGroup = () => {
  const [createGroup, { loading, error }] = useMutation(CREATE_GROUP_MUTATION, {
    onCompleted: () => {
      navigate(routes.teacher())
      toast.success('Group created!')
    },
    onError: (error) => {
      navigate(routes.teacher())
      toast.error(error.message)
    },
  })

  const onSave = (input) => {
    input.awardedPoints = 0
    createGroup({ variables: { input } })
  }

  return (
    <div className="rw-segment">
      <MetaTags title="New Group" description="New Group page" />
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Group</h2>
      </header>
      <Link to={routes.teacher()} className="nes-btn">{`<- Back Home`}</Link>
      <div className="rw-segment-main">
        <TeacherNewGroupForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  )
}

export default TeacherNewGroup

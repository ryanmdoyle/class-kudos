import { navigate, routes } from '@redwoodjs/router'

import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import GroupForm from 'src/components/Group/GroupForm'

export const QUERY = gql`
  query EditGroupById($id: String!) {
    group: group(id: $id) {
      id
      name
      description
      enrollId
      ownerId
      archived
    }
  }
`
const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroupMutation($id: String!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
      enrollId
      ownerId
      archived
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ group }) => {
  const [updateGroup, { loading, error }] = useMutation(UPDATE_GROUP_MUTATION, {
    onCompleted: () => {
      toast.success('Group updated')
      navigate(routes.groups())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSave = (input, id) => {
    updateGroup({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit Group {group?.id}
        </h2>
      </header>
      <div className="rw-segment-main">
        <GroupForm
          group={group}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

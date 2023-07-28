import { navigate, routes } from '@redwoodjs/router'

import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import RedeemedForm from 'src/components/Redeemed/RedeemedForm'

export const QUERY = gql`
  query EditRedeemedById($id: String!) {
    redeemed: redeemed(id: $id) {
      id
      userId
      name
      cost
      response
      reviewed
      reviewedAt
      groupId
      createdAt
    }
  }
`
const UPDATE_REDEEMED_MUTATION = gql`
  mutation UpdateRedeemedMutation($id: String!, $input: UpdateRedeemedInput!) {
    updateRedeemed(id: $id, input: $input) {
      id
      userId
      name
      cost
      response
      reviewed
      reviewedAt
      groupId
      createdAt
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Failure = ({ error }) => (
  <div className="rw-cell-error">{error?.message}</div>
)

export const Success = ({ redeemed }) => {
  const [updateRedeemed, { loading, error }] = useMutation(
    UPDATE_REDEEMED_MUTATION,
    {
      onCompleted: () => {
        toast.success('Redeemed updated')
        navigate(routes.redeemeds())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input, id) => {
    updateRedeemed({ variables: { id, input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">
          Edit Redeemed {redeemed?.id}
        </h2>
      </header>
      <div className="rw-segment-main">
        <RedeemedForm
          redeemed={redeemed}
          onSave={onSave}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  )
}

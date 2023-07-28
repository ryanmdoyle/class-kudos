import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import RedeemedForm from 'src/components/Redeemed/RedeemedForm'

const CREATE_REDEEMED_MUTATION = gql`
  mutation CreateRedeemedMutation($input: CreateRedeemedInput!) {
    createRedeemed(input: $input) {
      id
    }
  }
`

const NewRedeemed = () => {
  const [createRedeemed, { loading, error }] = useMutation(
    CREATE_REDEEMED_MUTATION,
    {
      onCompleted: () => {
        toast.success('Redeemed created')
        navigate(routes.redeemeds())
      },
      onError: (error) => {
        toast.error(error.message)
      },
    }
  )

  const onSave = (input) => {
    createRedeemed({ variables: { input } })
  }

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Redeemed</h2>
      </header>
      <div className="rw-segment-main">
        <RedeemedForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  )
}

export default NewRedeemed

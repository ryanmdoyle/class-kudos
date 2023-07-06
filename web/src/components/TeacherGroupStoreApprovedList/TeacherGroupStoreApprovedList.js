import { useParams } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import { QUERY as TECHER_GROUP_STORE_REQUESTED_QUERY } from 'src/components/TeacherGroupStoreRequestedCell/TeacherGroupStoreRequestedCell'
import { timeTag, truncate } from 'src/lib/formatters'

const DELETE_REDEEMED_MUTATION = gql`
  mutation DeleteRedeemedMutation($id: String!) {
    deleteRedeemed(id: $id) {
      id
    }
  }
`

const TeacherGroupStoreApprovedList = ({ redeemeds }) => {
  const { id } = useParams()

  const [deleteRedeemed] = useMutation(DELETE_REDEEMED_MUTATION, {
    onCompleted: () => {
      toast.success('Redeemed deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    refetchQueries: [
      { query: TECHER_GROUP_STORE_REQUESTED_QUERY, variables: { groupId: id } },
    ],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (redeemed) => {
    if (
      confirm(
        'Are you sure you want to delete ' +
          redeemed.name +
          'for ' +
          redeemed.user.firstName +
          '?'
      )
    ) {
      deleteRedeemed({ variables: { id: redeemed.id } })
    }
  }

  return (
    <table className="rw-table text-xs">
      <thead>
        <tr>
          <th>Award</th>
          <th>Requested by</th>
          <th>Appoved on</th>
          <th>Cost</th>
          <th>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {redeemeds.map((redeemed) => (
          <tr key={redeemed.id}>
            <td>{truncate(redeemed.name)}</td>
            <td>
              {redeemed.user.firstName} {redeemed.user.lastName}
            </td>
            <td>{timeTag(redeemed.reviewedAt)}</td>
            <td>{truncate(redeemed.cost)}</td>
            <td>
              <nav className="rw-table-actions">
                <button
                  type="button"
                  title={'Delete redeemed ' + redeemed.id}
                  className="rw-button rw-button-small rw-button-red"
                  onClick={() => onDeleteClick(redeemed)}
                >
                  Delete
                </button>
              </nav>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TeacherGroupStoreApprovedList

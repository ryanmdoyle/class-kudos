import { timeTag, truncate } from 'src/lib/formatters'

const StudentGroupRecentRedeemedList = ({ redeemed }) => {
  return (
    <div className="h-full w-full overflow-y-scroll">
      <table className="rw-table text-xs">
        <thead>
          <tr>
            <th>Name</th>
            <th>Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {redeemed.map((redeemed) => {
            return (
              <tr key={redeemed.id}>
                <td>{redeemed.name}</td>
                <td>{truncate(redeemed.cost)}</td>
                <td>
                  {redeemed.reviewedAt ? (
                    <span>Reviewed {timeTag(redeemed.reviewedAt)}</span>
                  ) : (
                    <span className="nes-text is-warning">
                      Requested {timeTag(redeemed.createdAt)}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default StudentGroupRecentRedeemedList

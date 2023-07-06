export const schema = gql`
  type Redeemed {
    id: String!
    user: User!
    userId: String!
    name: String!
    cost: Int!
    response: String
    reviewed: Boolean!
    reviewedAt: DateTime
    group: Group!
    groupId: String!
    createdAt: DateTime!
  }

  type Query {
    redeemeds: [Redeemed!]! @requireAuth
    redeemed(id: String!): Redeemed @requireAuth
  }

  input CreateRedeemedInput {
    userId: String!
    name: String!
    cost: Int!
    response: String
    reviewed: Boolean!
    reviewedAt: DateTime
    groupId: String!
  }

  input UpdateRedeemedInput {
    userId: String
    name: String
    cost: Int
    response: String
    reviewed: Boolean
    reviewedAt: DateTime
    groupId: String
  }

  type Mutation {
    createRedeemed(input: CreateRedeemedInput!): Redeemed! @requireAuth
    updateRedeemed(id: String!, input: UpdateRedeemedInput!): Redeemed!
      @requireAuth
    deleteRedeemed(id: String!): Redeemed! @requireAuth
  }
`

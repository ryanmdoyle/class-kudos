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
    redeemedOfStudent(input: RedeemedOfStudentInput!): [Redeemed!]! @requireAuth
    redeemedOfGroupRequested(groupId: String!): [Redeemed!] @requireAuth
    redeemedOfGroupApproved(groupId: String!): [Redeemed!] @requireAuth
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

  input StudentRedeemedInput {
    userId: String!
    rewardId: String!
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

  input RedeemedOfStudentInput {
    userId: String!
    groupId: String
  }

  type Mutation {
    createRedeemed(input: CreateRedeemedInput!): Redeemed! @requireAuth
    studentRedeemed(input: StudentRedeemedInput!): Redeemed! @requireAuth
    updateRedeemed(id: String!, input: UpdateRedeemedInput!): Redeemed!
      @requireAuth
    deleteRedeemed(id: String!): Redeemed! @requireAuth
    approveRedeemed(id: String!): Redeemed! @requireAuth
  }
`

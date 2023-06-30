export const schema = gql`
  type Reward {
    id: String!
    name: String!
    cost: Int!
    responseRequired: Boolean!
    responsePrompt: String
    group: Group
    groupId: String
  }

  type Query {
    rewards: [Reward!]! @requireAuth
    reward(id: String!): Reward @requireAuth
  }

  input CreateRewardInput {
    name: String!
    cost: Int!
    responseRequired: Boolean!
    responsePrompt: String
    groupId: String
  }

  input UpdateRewardInput {
    name: String
    cost: Int
    responseRequired: Boolean
    responsePrompt: String
    groupId: String
  }

  type Mutation {
    createReward(input: CreateRewardInput!): Reward! @requireAuth
    updateReward(id: String!, input: UpdateRewardInput!): Reward! @requireAuth
    deleteReward(id: String!): Reward! @requireAuth
  }
`

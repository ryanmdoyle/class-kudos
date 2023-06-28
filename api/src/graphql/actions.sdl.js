export const schema = gql`
  type Action {
    id: String!
    name: String!
    value: Int!
    group: Group!
    groupId: String!
  }

  type Query {
    actions: [Action!]! @requireAuth
    action(id: String!): Action @requireAuth
  }

  input CreateActionInput {
    name: String!
    value: Int!
    groupId: String!
  }

  input UpdateActionInput {
    name: String
    value: Int
    groupId: String
  }

  type Mutation {
    createAction(input: CreateActionInput!): Action! @requireAuth
    updateAction(id: String!, input: UpdateActionInput!): Action! @requireAuth
    deleteAction(id: String!): Action! @requireAuth
  }
`

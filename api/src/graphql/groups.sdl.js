export const schema = gql`
  type Group {
    id: String!
    name: String!
    description: String
    enrollId: String
    owner: User!
    ownerId: String!
    archived: Boolean!
  }

  type Query {
    groups: [Group!]! @requireAuth
    group(id: String!): Group @requireAuth
  }

  input CreateGroupInput {
    name: String!
    description: String
    enrollId: String
    ownerId: String!
    archived: Boolean!
  }

  input UpdateGroupInput {
    name: String
    description: String
    enrollId: String
    ownerId: String
    archived: Boolean
  }

  type Mutation {
    createGroup(input: CreateGroupInput!): Group! @requireAuth
    updateGroup(id: String!, input: UpdateGroupInput!): Group! @requireAuth
    deleteGroup(id: String!): Group! @requireAuth
  }
`

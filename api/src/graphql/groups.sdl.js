export const schema = gql`
  type Group {
    id: String!
    name: String!
    description: String
    enrollId: String
    owner: User!
    ownerId: String!
    archived: Boolean!
    enrollments: [Enrollment!]
  }

  type Query {
    groups: [Group!]! @requireAuth
    groupsOwned(ownerId: String!, archived: Boolean): [Group!]! @requireAuth
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
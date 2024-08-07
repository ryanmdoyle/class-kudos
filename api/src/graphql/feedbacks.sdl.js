export const schema = gql`
  type Feedback {
    id: String!
    createdAt: DateTime!
    name: String!
    value: Int!
    user: User!
    userId: String!
    group: Group
    groupId: String
  }

  type Query {
    feedbacks: [Feedback!]! @requireAuth
    feedback(id: String!): Feedback @requireAuth
    feedbackOfUser(userId: String!, groupId: String, take: Int): [Feedback!]!
      @requireAuth
  }

  input CreateFeedbackInput {
    name: String!
    value: Int!
    userId: String!
    groupId: String!
  }

  input CreateFeedbacksInput {
    name: String!
    value: Int!
    userIds: [String!]!
    groupId: String!
  }

  input UpdateFeedbackInput {
    name: String
    value: Int
    userId: String
    groupId: String
  }

  type Mutation {
    createFeedback(input: CreateFeedbackInput!): Feedback! @requireAuth
    createFeedbacks(input: CreateFeedbacksInput!): Int! @requireAuth
    updateFeedback(id: String!, input: UpdateFeedbackInput!): Feedback!
      @requireAuth
    deleteFeedback(id: String!): Feedback! @requireAuth
  }
`

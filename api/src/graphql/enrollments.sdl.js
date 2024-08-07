export const schema = gql`
  type Enrollment {
    id: String!
    user: User!
    userId: String!
    group: Group!
    groupId: String!
    points: Int!
  }

  type Query {
    enrollments: [Enrollment!]! @requireAuth
    enrollment(id: String!): Enrollment @requireAuth
    enrolledUsers(id: String!): [Enrollment!] @requireAuth
    enrolledGroups: [Enrollment!] @requireAuth
    findEnrolledGroups(userId: String!): [Enrollment!] @requireAuth
    enrolledGroup(groupId: String!, userId: String!): Enrollment! @requireAuth
  }

  input CreateEnrollmentInput {
    userId: String!
    groupEnrollId: String!
  }

  input CreateEnrollmentFromEmailInput {
    email: String!
    groupId: String!
  }

  input UpdateEnrollmentInput {
    userId: String
    groupId: String
    points: Int
  }

  input UpdateEnrollmentPointsInput {
    userId: String
    groupId: String
    updateValue: Int
  }

  type Mutation {
    createEnrollment(input: CreateEnrollmentInput!): Enrollment! @requireAuth
    createEnrollmentFromEmail(
      input: CreateEnrollmentFromEmailInput!
    ): Enrollment! @requireAuth
    updateEnrollment(id: String!, input: UpdateEnrollmentInput!): Enrollment!
      @requireAuth
    updateEnrollmentPoints(input: UpdateEnrollmentPointsInput!): Enrollment!
      @requireAuth
    deleteEnrollment(id: String!): Enrollment! @requireAuth
  }
`

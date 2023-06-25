export const standard = defineScenario({
  userRole: {
    one: {
      data: {
        role: 'String',
        user: {
          create: {
            email: 'String5299260',
            hashedPassword: 'String',
            salt: 'String',
            firstName: 'String',
            lastName: 'String',
          },
        },
      },
    },
    two: {
      data: {
        role: 'String',
        user: {
          create: {
            email: 'String594500',
            hashedPassword: 'String',
            salt: 'String',
            firstName: 'String',
            lastName: 'String',
          },
        },
      },
    },
  },
})

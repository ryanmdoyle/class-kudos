export const standard = defineScenario({
  enrollment: {
    one: {
      data: {
        user: {
          create: {
            email: 'String2179163',
            hashedPassword: 'String',
            salt: 'String',
            firstName: 'String',
            lastName: 'String',
          },
        },
        group: {
          create: {
            name: 'String',
            owner: {
              create: {
                email: 'String98764',
                hashedPassword: 'String',
                salt: 'String',
                firstName: 'String',
                lastName: 'String',
              },
            },
          },
        },
      },
    },
    two: {
      data: {
        user: {
          create: {
            email: 'String7314850',
            hashedPassword: 'String',
            salt: 'String',
            firstName: 'String',
            lastName: 'String',
          },
        },
        group: {
          create: {
            name: 'String',
            owner: {
              create: {
                email: 'String3699905',
                hashedPassword: 'String',
                salt: 'String',
                firstName: 'String',
                lastName: 'String',
              },
            },
          },
        },
      },
    },
  },
})

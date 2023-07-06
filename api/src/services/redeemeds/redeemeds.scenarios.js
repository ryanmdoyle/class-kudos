export const standard = defineScenario({
  redeemed: {
    one: {
      data: {
        name: 'String',
        cost: 4366853,
        user: {
          create: {
            email: 'String9585826',
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
                email: 'String6911746',
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
        name: 'String',
        cost: 7699026,
        user: {
          create: {
            email: 'String626561',
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
                email: 'String8572518',
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

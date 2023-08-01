import { Link, routes, navigate } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

const HomePage = () => {
  const { isAuthenticated, hasRole } = useAuth()

  if (isAuthenticated) {
    hasRole('TEACHER') ? navigate(routes.teacher()) : navigate(routes.student())
  }
  return (
    <div className="mx-auto max-w-[95%]">
      <MetaTags title="Home" description="Home page" />
      <h1 className="mb-4 text-2xl">Welcome to Classroom Kudos!</h1>
      <h2 className="mb-4 text-lg">
        Create Positive Learning Environments, One Kudo at a Time
      </h2>
      <p className="mb-4 text-sm">
        Are you ready to revolutionize your classroom management and foster a
        culture of positivity, engagement, and growth? Look no further!
        Classroom Kudos is your all-in-one solution for effortlessly managing
        your classroom and empowering your students.
      </p>
      <h2 className="mb-4 text-lg text-green-500">
        For Teachers: Why Classroom Kudos?
      </h2>
      <ul className="mb-4 text-xs">
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Effortless Classroom Management:
          </strong>{' '}
          Say goodbye to tedious spreadsheets, huge websites with featuers you
          never use, and paperwork! With Classroom Kudos, you can effortlessly
          create groups and award students points (aka Kudos) directly from your
          personalized teacher dashboard.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Encourage Positive Behavior:
          </strong>{' '}
          Recognize and reward your students' achievements, efforts, and
          positive behavior with Kudos. Motivate them to excel and build
          self-esteem in a nurturing and supportive environment.
        </li>
        <li className="mb-3 ml-4">
          {' '}
          <strong className="text-green-500">
            Innovative Classroom Store:
          </strong>{' '}
          Students can redeem their hard-earned Kudos for a variety of fun and
          educational rewards that you create, keeping them motivated and
          invested in their learning journey.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">Safe and Secure:</strong> Classroom
          Kudos values the privacy and security of both teachers and students.
          Rest assured, your data is safeguarded with state-of-the-art
          encryption and protection protocols.
        </li>
      </ul>
      <h2 className="mb-4 text-lg text-orange-500">For Students:</h2>
      <ul className="mb-4 text-xs">
        <li className="mb-3 ml-4">
          <strong className="text-orange-500">Student Dashboard:</strong>{' '}
          Students can log in to their own dashboard to view their Kudos points,
          track their progress, and redeem teacher created rewards.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-orange-500">Learn, Grow, and Thrive:</strong>{' '}
          Classroom Kudos fosters a positive learning environment that
          encourages students to excel academically and socially, empowering
          them to become the best version of themselves.
        </li>
      </ul>
      <p className="mb-4 text-sm">
        Are you ready to embark on an unforgettable journey of positive
        reinforcement and academic success? Join Classroom Kudos today and
        discover the power of motivation and recognition in shaping young minds.
      </p>
      <Link
        to={routes.signup()}
        title={'Create account'}
        className="pb-12 text-blue-500"
      >
        Sign up now
      </Link>{' '}
      to unlock the potential within your classroom!
    </div>
  )
}

export default HomePage

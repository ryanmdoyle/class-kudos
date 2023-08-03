import { useEffect } from 'react'

import { Link, routes, navigate } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

const HomePage = () => {
  const { isAuthenticated, currentUser, hasRole } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (hasRole('TEACHER')) {
        navigate(routes.teacher({ id: currentUser.id }))
      } else {
        navigate(routes.student({ id: currentUser.id }))
      }
    }
  }, [isAuthenticated, currentUser, hasRole])

  return (
    <div className="container mx-auto px-8">
      <MetaTags title="Home" description="Class Kudos home page." />
      <h2 className="mb-8 text-lg">
        Create Positive Learning Environments, One Kudo at a Time
      </h2>
      <p className="mb-8 text-sm">
        Are you ready to simplify your classroom management and foster a culture
        of positivity? Look no further! Class Kudos is your all-in-one solution
        for effortlessly managing your classroom rewards system and empowering
        your students.
      </p>
      <h2 className="mb-8 text-lg text-green-500">
        For Teachers: Why Class Kudos?
      </h2>
      <ul className="mb-8 text-xs">
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Effortless Class Management:
          </strong>{' '}
          Say goodbye to tedious paper money, huge websites with features you
          never use, or....spreadsheets?! With Class Kudos, you can effortlessly
          create groups and award students points (aka Kudos) directly from your
          teacher dashboard.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Encourage Positive Behavior:
          </strong>{' '}
          Recognize and reward your students achievements, efforts, and positive
          behavior with Kudos. Motivate them to excel and build self-esteem in a
          nurturing and supportive environment.
        </li>
        <li className="mb-3 ml-4">
          {' '}
          <strong className="text-green-500">
            Innovative Class Store:
          </strong>{' '}
          Teachers create a list of &quot;rewards&quot; students can redeem with
          their kudos. Maybe a day on the one comfortable chair in the whole
          school. Or perhaps five minutes to present a hobby to the class, or
          change seats for the day. Anything that works for the classroom.
          Students redeem teacher-created rewards directly from their own
          dashboards when they earn enough kudos, and you teachers review them
          on your own time.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">Safe and Secure:</strong> Class
          Kudos is activly being developed by an actual classroom teacher that
          values the real privacy of students. The only information collected is
          the provided name and email. Students are never emailed. Information
          is never sold.
        </li>
      </ul>
      <h2 className="mb-8 text-lg text-orange-500">For Students:</h2>
      <ul className="mb-8 text-xs">
        <li className="mb-3 ml-4">
          <strong className="text-orange-500">Track Progress:</strong> Students
          can log in to their own dashboard to enroll in groups greated by
          teachers, where they can see feedback and points (Kudos) that have
          been awarded by their teacher.
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-orange-500">Redeem Awards:</strong> Students
          can see awards thst are available to them, based on a classroom store
          that is created by their teacher. When they have enough Kudos, they
          can independently redeem the awards from their own dashboards!
        </li>
      </ul>
      <p className="mb-8 text-sm">
        Are you ready to discover how easy it can be to stop standing over the
        printer making copies of school paper mone using half your whiteboard to
        track table points? There&apos;s a better way. Join Class Kudos today.
      </p>
      <Link
        to={routes.signup()}
        title={'Create account'}
        className="pb-12 text-blue-500"
      >
        Sign up now
      </Link>{' '}
      to unlock the potential within your classroom!
      <div className="align-center my-8 flex justify-between pb-16 text-xs">
        <span>Or, if your find this site helpful, consider donating!</span>
        <a
          href="https://www.buymeacoffee.com/hiimdoyle"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
            style={{ height: '40px', width: '150px' }}
          />
        </a>
      </div>
    </div>
  )
}

export default HomePage

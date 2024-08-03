import { useEffect } from 'react'

import { Link, routes, navigate } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

import studentDash from './studentDash.png'
import teacherDash from './teacherDash.png'

const HomePage = () => {
  const { isAuthenticated, currentUser, hasRole } = useAuth()

  useEffect(() => {
    if (currentUser && isAuthenticated) {
      if (hasRole('TEACHER')) {
        navigate(routes.teacher({ id: currentUser.id }))
      } else {
        navigate(routes.student({ id: currentUser.id }))
      }
    }
  }, [isAuthenticated, currentUser, hasRole])

  return (
    <div className="container mx-auto max-w-screen-md px-4">
      <Metadata title="Home" description="Class Kudos home page." />
      <h2 className="mb-8 text-lg leading-loose">
        Create Positive Learning Environments, One Kudo at a Time
      </h2>
      <p className="mb-8 text-sm leading-loose">
        Are you ready to simplify your classroom management and foster a culture
        of positivity? Look no further! Class Kudos is your all-in-one solution
        for effortlessly managing your classroom rewards system and empowering
        your students.
      </p>
      <h2 className="mb-8 text-lg text-green-500">Why Kudos?</h2>
      <ul className="mb-8 text-sm  leading-loose">
        <img
          className="m-auto mb-8 w-4/5 border-2 border-solid border-black shadow-xl"
          src={teacherDash}
          alt="teacher dashboard screenshot"
        />
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Effortless Class Management:
          </strong>{' '}
          {`Say goodbye to tedious paper money, oversized websites with unnecessary features, or... spreadsheets?! With Class Kudos, you can easily create groups and award students points (aka Kudos) directly from your teacher dashboard.`}
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">
            Encourage Positive Behavior:
          </strong>{' '}
          {`Recognize and reward your students' achievements, efforts, and positive behavior with Kudos. Motivate them to excel and build self-esteem in a nurturing and supportive environment.`}
        </li>
        <li className="mb-3 ml-4">
          {' '}
          <strong className="text-green-500">
            Innovative Class Store:
          </strong>{' '}
          {`Teachers can create a list of rewards that students can redeem with their Kudos. Whether it's a day on the one comfortable chair in the whole school, five minutes to present a hobby to the class, or changing seats for the day, you can customize rewards to fit your classroom. Students redeem these teacher-created rewards directly from their own dashboards when they earn enough Kudos, and you can review them at your convenience.`}
        </li>
        <img
          className="m-auto my-8 w-4/5 border-2 border-solid border-black shadow-xl"
          src={studentDash}
          alt="student dashboard screenshot"
        />
        <li className="mb-3 ml-4">
          <strong className="text-green-500">Student Engagement:</strong>{' '}
          {`Students can log in to their own dashboards to see their progress, view the points (Kudos) they've earned, and redeem available rewards. This empowers students to take an active role in their behavior and progress, making classroom management smoother and more interactive.`}
        </li>
        <li className="mb-3 ml-4">
          <strong className="text-green-500">Safe and Secure:</strong>{' '}
          {`Class
          Kudos is activly being developed by an actual classroom teacher that
          values the real privacy of students. The only information collected is
          the provided name and email. Students are never emailed. Information
          is never sold.`}
        </li>
      </ul>
      <p className="mb-8 text-sm leading-loose">
        {`Are you ready to discover how easy it can be to stop standing over the printer making copies of school paper money or using half your whiteboard to track table points? There's a better way! Join Class Kudos today.`}
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

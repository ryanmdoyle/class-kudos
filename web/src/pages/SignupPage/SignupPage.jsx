import { useRef } from 'react'
import { useEffect } from 'react'

import {
  Form,
  Label,
  TextField,
  PasswordField,
  SelectField,
  FieldError,
  Submit,
} from '@redwoodjs/forms'
import { Link, navigate, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'

const SignupPage = () => {
  const { isAuthenticated, signUp, currentUser, hasRole } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (hasRole('TEACHER')) {
        navigate(routes.teacher({ id: currentUser.id }))
      } else if (hasRole('STUDENT')) {
        navigate(routes.student({ id: currentUser.id }))
      } else {
        navigate(routes.home())
      }
    }
  }, [isAuthenticated, currentUser, hasRole])

  // focus on email box on page load
  const emailRef = useRef(null)
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const onSubmit = async (data) => {
    if (
      window.confirm(
        `Please confirm you'd like to create a ${data.role.toUpperCase()} account.`
      )
    ) {
      const response = await signUp({
        username: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      })

      if (response.message) {
        toast(response.message)
      } else if (response.error) {
        toast.error(response.error)
      } else {
        // user is signed in automatically
        toast.success('Welcome!')
      }
    }
  }

  return (
    <>
      <MetaTags title="Signup" />

      <main className="rw-main">
        <Toaster toastOptions={{ className: 'rw-toast', duration: 6000 }} />
        <div className="rw-scaffold rw-login-container">
          <div className="rw-segment">
            <header className="rw-segment-header">
              <h2 className="rw-heading rw-heading-secondary">Signup</h2>
            </header>

            <div className="rw-segment-main">
              <div className="rw-form-wrapper">
                <Form onSubmit={onSubmit} className="rw-form-wrapper">
                  <Label
                    name="firstName"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    First Name
                  </Label>
                  <TextField
                    name="firstName"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    validation={{
                      required: {
                        value: true,
                        message: 'First Name is required',
                      },
                    }}
                  />

                  <FieldError name="firstName" className="rw-field-error" />

                  <Label
                    name="lastName"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Last Name
                  </Label>
                  <TextField
                    name="lastName"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    validation={{
                      required: {
                        value: true,
                        message: 'Last Name is required',
                      },
                    }}
                  />

                  <FieldError name="lastName" className="rw-field-error" />
                  {/*  */}
                  <Label
                    name="email"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Email
                  </Label>
                  <TextField
                    name="email"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    ref={emailRef}
                    validation={{
                      required: true,
                      pattern: {
                        value: /^[^@]+@[^.]+\..+$/,
                        message: 'Please enter a valid email address',
                      },
                    }}
                  />

                  <FieldError name="email" className="rw-field-error" />

                  <Label
                    name="password"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Password
                  </Label>
                  <PasswordField
                    name="password"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    autoComplete="current-password"
                    validation={{
                      required: {
                        value: true,
                        message: 'Password is required',
                      },
                    }}
                  />

                  <FieldError name="password" className="rw-field-error" />

                  <Label
                    name="role"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    You are a:
                  </Label>
                  <SelectField
                    name="role"
                    validation={{
                      required: {
                        value: true,
                        message: 'You must select an account type to continue.',
                      },
                      validate: {
                        matchesInitialValue: (value) => {
                          return value !== 'Select an option'
                        },
                      },
                    }}
                  >
                    <option>Select an option</option>
                    <option>Student</option>
                    <option>Teacher</option>
                  </SelectField>

                  <FieldError name="role" className="rw-field-error" />

                  <div className="rw-button-group">
                    <Submit className="rw-button rw-button-blue">
                      Sign Up
                    </Submit>
                  </div>
                </Form>
              </div>
            </div>
          </div>
          <div className="rw-login-link">
            <span>Already have an account?</span>{' '}
            <Link to={routes.login()} className="rw-link">
              Log in!
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default SignupPage

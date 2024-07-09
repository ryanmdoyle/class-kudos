import Sentry from 'src/lib/sentry'
import { RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './scaffold.css'
import { AuthProvider, useAuth } from './auth'

import { Toaster } from '@redwoodjs/web/toast'

import './index.css'

const App = () => (
  <Sentry.ErrorBoundary fallback={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle · %AppTitle">
      <AuthProvider>
        <RedwoodApolloProvider useAuth={useAuth}>
          <Toaster />
          <Routes />
        </RedwoodApolloProvider>
      </AuthProvider>
    </RedwoodProvider>
  </Sentry.ErrorBoundary>
)

export default App

import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession } from './api'
import Login from './pages/Login'
import Trips from './pages/Trips'
import Trip from './pages/Trip'

// Here I choose the first page: organisers see their trips, travellers see their one trip
function Home() {
  const session = getSession()
  if (!session) return <Login />
  if (session.role === 'traveller') return <Navigate to={`/trips/${session.tripId}`} replace />
  return <Trips />
}

// Here I send anyone who is not signed in back to the login page
function Protected({ children }) {
  return getSession() ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trips/:id" element={<Protected><Trip /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

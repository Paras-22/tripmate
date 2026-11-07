import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getSession, getWithOffline, signOut } from '../api'
import { formatDate } from '../itinerary'
import useOnline from '../useOnline'
import TripForm from '../components/TripForm'

// Here I made the organiser's home page with the list of trips
export default function Trips() {
  const navigate = useNavigate()
  const online = useOnline()
  const [trips, setTrips] = useState(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setTrips((await getWithOffline('/trips')).data)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createTrip(values) {
    const trip = await api('/trips', 'POST', values)
    navigate(`/trips/${trip._id}`)
  }

  async function handleSignOut() {
    await signOut()
    navigate(0)
  }

  return (
    <main className="page">
      <header className="top">
        <p className="brand">TripMate</p>
        <button className="plain" onClick={handleSignOut}>Sign out</button>
      </header>

      <h1>Hi {getSession().name}</h1>
      {!online && <p className="banner">You are offline. Showing your saved trips.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {adding ? (
        <TripForm onSubmit={createTrip} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} disabled={!online}>New trip</button>
      )}

      {trips?.length === 0 && !adding && (
        <p className="muted">No trips yet. Create your first one to get an invite code.</p>
      )}

      <ul className="trip-list">
        {trips?.map((trip) => (
          <li key={trip._id}>
            <Link to={`/trips/${trip._id}`} className="card trip-link">
              <strong>{trip.title}</strong>
              <span className="muted">
                {trip.destination} · {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getSession, getWithOffline, signOut } from '../services/api'
import { formatDate, groupByDay } from '../utils/itinerary'
import { createSubscription, getSubscription } from '../services/push'
import useOnline from '../hooks/useOnline'
import ActivityForm from '../components/ActivityForm'
import TripForm from '../components/TripForm'

// Here I made the itinerary page. Both roles use it, but only the organiser gets the edit buttons.
export default function Trip() {
  const { id } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const isOrganiser = getSession().role === 'organiser'
  const canEdit = isOrganiser && online

  const [trip, setTrip] = useState(null)
  const [savedCopy, setSavedCopy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // 'trip', 'new', or the activity being edited
  const [alertsOn, setAlertsOn] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, offline } = await getWithOffline(`/trips/${id}`)
      setTrip(data)
      setSavedCopy(offline)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  // Here I load the trip when the page opens, when the internet is back,
  // and when the service worker says a push message arrived.
  useEffect(() => {
    load()
    getSubscription().then((subscription) => setAlertsOn(Boolean(subscription)))
    navigator.serviceWorker?.addEventListener('message', load)
    return () => navigator.serviceWorker?.removeEventListener('message', load)
  }, [load, online])

  // Here every change returns the updated trip, so I close the form and show it
  async function save(path, method, values) {
    const updated = await api(`/trips/${id}${path}`, method, values)
    setTrip(updated)
    setEditing(null)
  }

  async function removeActivity(activity) {
    if (!confirm(`Remove "${activity.title}"?`)) return
    try {
      await save(`/activities/${activity._id}`, 'DELETE')
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeTrip() {
    if (!confirm(`Delete "${trip.title}" for everyone?`)) return
    try {
      await api(`/trips/${id}`, 'DELETE')
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  async function turnOnAlerts() {
    try {
      const subscription = await createSubscription()
      await api(`/trips/${id}/subscribe`, 'POST', subscription)
      setAlertsOn(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (!trip) {
    return (
      <main className="page">
        {error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading trip...</p>}
        <Link to="/">Back</Link>
      </main>
    )
  }

  const days = groupByDay(trip)

  return (
    <main className="page">
      <header className="top">
        {isOrganiser ? <Link to="/">All trips</Link> : <p className="brand">TripMate</p>}
        {!isOrganiser && <button className="plain" onClick={handleSignOut}>Leave trip</button>}
      </header>

      <h1>{trip.title}</h1>
      <p className="muted">
        {trip.destination} · {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
      </p>

      {(savedCopy || !online) && (
        <p className="banner">You are offline. This is the last saved plan.</p>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      {isOrganiser && (
        <section className="ticket">
          <span className="muted">Invite code</span>
          <strong>{trip.inviteCode}</strong>
        </section>
      )}

      {!isOrganiser && !alertsOn && (
        <section className="card alerts">
          <p>Get an alert when the plan changes.</p>
          <button onClick={turnOnAlerts} disabled={!online}>Turn on alerts</button>
        </section>
      )}
      {!isOrganiser && alertsOn && <p className="muted">Alerts are on for this trip.</p>}

      {editing === 'trip' && (
        <TripForm
          trip={trip}
          onSubmit={(values) => save('', 'PUT', values)}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing === 'new' && (
        <ActivityForm
          trip={trip}
          onSubmit={(values) => save('/activities', 'POST', values)}
          onCancel={() => setEditing(null)}
        />
      )}

      {canEdit && !editing && (
        <div className="row">
          <button onClick={() => setEditing('new')}>Add activity</button>
          <button className="plain" onClick={() => setEditing('trip')}>Edit trip</button>
          <button className="plain danger" onClick={removeTrip}>Delete trip</button>
        </div>
      )}

      {days.length === 0 && (
        <p className="muted">
          {isOrganiser ? 'No activities yet. Add the first one.' : 'The organiser has not added any activities yet.'}
        </p>
      )}

      {days.map((day) => (
        <section key={day.date} className="day">
          <h2>Day {day.number} <span className="muted">{formatDate(day.date)}</span></h2>
          <ul>
            {day.activities.map((activity) =>
              editing?._id === activity._id ? (
                <li key={activity._id}>
                  <ActivityForm
                    trip={trip}
                    activity={activity}
                    onSubmit={(values) => save(`/activities/${activity._id}`, 'PUT', values)}
                    onCancel={() => setEditing(null)}
                  />
                </li>
              ) : (
                <li key={activity._id} className="activity">
                  <time>{activity.time || 'Any time'}</time>
                  <div>
                    <span className={`tag ${activity.type}`}>{activity.type}</span>
                    <h3>{activity.title}</h3>
                    {activity.location && <p className="muted">{activity.location}</p>}
                    {activity.notes && <p>{activity.notes}</p>}
                    {canEdit && !editing && (
                      <div className="row">
                        <button className="plain" onClick={() => setEditing(activity)}>Edit</button>
                        <button className="plain danger" onClick={() => removeActivity(activity)}>Remove</button>
                      </div>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </main>
  )
}

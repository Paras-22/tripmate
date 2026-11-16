import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { saveSession } from '../api'
import { clearOffline } from '../offlineDB'
import Trip from './Trip'

// Here I test the itinerary page. Both roles use it, but only the organiser can change it.

const trip = {
  _id: 't1',
  title: 'Japan',
  destination: 'Tokyo',
  startDate: '2027-01-10',
  endDate: '2027-01-12',
  inviteCode: 'ABCD1234',
  activities: [
    { _id: 'a2', date: '2027-01-11', time: '12:00', title: 'Lunch', type: 'meal' },
    { _id: 'a1', date: '2027-01-10', time: '09:00', title: 'Flight', type: 'flight', location: 'Auckland Airport' },
  ],
}

const serverReturns = (data, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => data }))

function showTrip() {
  render(
    <MemoryRouter initialEntries={['/trips/t1']}>
      <Routes>
        <Route path="/trips/:id" element={<Trip />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const asOrganiser = () => saveSession({ token: 'jwt', role: 'organiser', name: 'Paras' })
const asTraveller = () => saveSession({ token: 'jwt', role: 'traveller', tripId: 't1' })

beforeEach(async () => {
  localStorage.clear()
  await clearOffline()
  globalThis.fetch = serverReturns(trip)
  vi.stubGlobal('confirm', () => true) // here I press OK on every "Are you sure?" box
})

afterEach(() => vi.unstubAllGlobals())

describe('organiser', () => {
  test('sees the invite code and the buttons to change the plan', async () => {
    asOrganiser()
    showTrip()
    expect(await screen.findByText('ABCD1234')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add activity' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit trip' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete trip' })).toBeTruthy()
  })

  // Here READ: the plan is grouped by day and sorted by time
  test('shows the plan day by day', async () => {
    asOrganiser()
    showTrip()
    const days = await screen.findAllByRole('heading', { level: 2 })
    expect(days.map((day) => day.textContent)).toEqual([expect.stringMatching(/^Day 1/), expect.stringMatching(/^Day 2/)])
    expect(screen.getByText('Auckland Airport')).toBeTruthy()
  })

  // Here CREATE: the new activity is sent with POST and the page shows the trip the server sends back
  test('adds an activity', async () => {
    asOrganiser()
    showTrip()
    fireEvent.click(await screen.findByRole('button', { name: 'Add activity' }))

    const updated = { ...trip, activities: [...trip.activities, { _id: 'a3', date: '2027-01-12', title: 'Temple tour', type: 'tour' }] }
    globalThis.fetch = serverReturns(updated, 201)
    fireEvent.change(screen.getByLabelText('What is happening?'), { target: { value: 'Temple tour' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2027-01-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Temple tour')).toBeTruthy()
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/trips/t1/activities')
    expect(options.method).toBe('POST')
  })

  // Here UPDATE: Edit opens the form with the saved values and sends PUT
  test('edits an activity', async () => {
    asOrganiser()
    showTrip()
    const flight = (await screen.findByText('Flight')).closest('li')
    fireEvent.click(within(flight).getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('What is happening?').value).toBe('Flight')

    globalThis.fetch = serverReturns({ ...trip, activities: [{ ...trip.activities[1], title: 'Flight to Tokyo' }] })
    fireEvent.change(screen.getByLabelText('What is happening?'), { target: { value: 'Flight to Tokyo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Flight to Tokyo')).toBeTruthy()
    expect(fetch.mock.calls[0][0]).toBe('/api/trips/t1/activities/a1')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
  })

  // Here DELETE: Remove sends DELETE for that one activity
  test('removes an activity', async () => {
    asOrganiser()
    showTrip()
    const lunch = (await screen.findByText('Lunch')).closest('li')
    globalThis.fetch = serverReturns({ ...trip, activities: [trip.activities[1]] })
    fireEvent.click(within(lunch).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('Lunch')).toBeNull())
    expect(fetch.mock.calls[0][0]).toBe('/api/trips/t1/activities/a2')
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
  })

  test('deletes the whole trip and goes back to the trips list', async () => {
    asOrganiser()
    showTrip()
    await screen.findByText('Flight')
    globalThis.fetch = serverReturns({ message: 'Trip deleted' })
    fireEvent.click(screen.getByRole('button', { name: 'Delete trip' }))

    expect(await screen.findByText('Home page')).toBeTruthy()
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
  })
})

describe('traveller', () => {
  test('can read the plan but sees no edit buttons or invite code', async () => {
    asTraveller()
    showTrip()
    expect(await screen.findByText('Flight')).toBeTruthy()
    expect(screen.queryByText('ABCD1234')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add activity' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  test('is offered alerts for the trip', async () => {
    asTraveller()
    showTrip()
    expect(await screen.findByRole('button', { name: 'Turn on alerts' })).toBeTruthy()
  })
})

describe('offline and errors', () => {
  // Here the saved copy from IndexedDB is shown when there is no internet
  test('shows the last saved plan with a banner when offline', async () => {
    asTraveller()
    showTrip()
    await screen.findByText('Flight') // online: this saves the trip
    document.body.innerHTML = ''

    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    showTrip()
    expect(await screen.findByText('You are offline. This is the last saved plan.')).toBeTruthy()
    expect(screen.getByText('Flight')).toBeTruthy()
  })

  test('shows the server message when the user is not part of the trip', async () => {
    asTraveller()
    globalThis.fetch = serverReturns({ error: 'You are not part of this trip' }, 403)
    showTrip()
    expect(await screen.findByText('You are not part of this trip')).toBeTruthy()
  })

  test('says when the trip has no activities yet', async () => {
    asTraveller()
    globalThis.fetch = serverReturns({ ...trip, activities: [] })
    showTrip()
    expect(await screen.findByText('The organiser has not added any activities yet.')).toBeTruthy()
  })
})

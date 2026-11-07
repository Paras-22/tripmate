import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getWithOffline, saveSession } from './api'
import { groupByDay } from './itinerary'
import Trip from './pages/Trip'

const trip = {
  _id: 't1',
  title: 'Japan',
  destination: 'Tokyo',
  startDate: '2027-01-10',
  endDate: '2027-01-12',
  inviteCode: 'ABCD1234',
  activities: [
    { _id: 'a2', date: '2027-01-11', time: '12:00', title: 'Lunch', type: 'meal' },
    { _id: 'a3', date: '2027-01-10', time: '18:00', title: 'Hotel', type: 'hotel' },
    { _id: 'a1', date: '2027-01-10', time: '09:00', title: 'Flight', type: 'flight' },
  ],
}

const serverReturns = (data) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => data }))

function showTrip() {
  render(
    <MemoryRouter initialEntries={['/trips/t1']}>
      <Routes>
        <Route path="/trips/:id" element={<Trip />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = serverReturns(trip)
})

test('groupByDay sorts activities and numbers the days', () => {
  const days = groupByDay(trip)
  expect(days.map((day) => day.number)).toEqual([1, 2])
  expect(days[0].activities.map((a) => a.title)).toEqual(['Flight', 'Hotel'])
})

test('the saved trip is used when there is no connection', async () => {
  await getWithOffline('/trips/t1') // online: this saves the trip in IndexedDB

  globalThis.fetch = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })

  const result = await getWithOffline('/trips/t1')
  expect(result.offline).toBe(true)
  expect(result.data.title).toBe('Japan')
})

test('a real server error is not hidden by the saved trip', async () => {
  await getWithOffline('/trips/t1')
  globalThis.fetch = vi.fn(async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: 'You are not part of this trip' }),
  }))
  await expect(getWithOffline('/trips/t1')).rejects.toThrow('not part of this trip')
})

test('the organiser sees the edit buttons and invite code', async () => {
  saveSession({ token: 'x', role: 'organiser', name: 'Sam' })
  showTrip()
  expect(await screen.findByText('ABCD1234')).toBeTruthy()
  expect(screen.getByText('Add activity')).toBeTruthy()
})

test('the traveller can read the plan but cannot edit it', async () => {
  saveSession({ token: 'x', role: 'traveller', tripId: 't1' })
  showTrip()
  expect(await screen.findByText('Flight')).toBeTruthy()
  expect(screen.queryByText('Add activity')).toBeNull()
  expect(screen.queryByText('ABCD1234')).toBeNull()
})

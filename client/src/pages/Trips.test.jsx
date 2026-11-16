import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { saveSession } from '../api'
import { clearOffline } from '../offlineDB'
import Trips from './Trips'

// Here I test the organiser's home page with the list of trips

const trips = [
  { _id: 't1', title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-15' },
  { _id: 't2', title: 'Bali', destination: 'Ubud', startDate: '2027-06-01', endDate: '2027-06-05' },
]

const serverReturns = (data, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => data }))

function showTrips() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Trips />} />
        <Route path="/trips/:id" element={<p>Trip page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  localStorage.clear()
  await clearOffline()
  saveSession({ token: 'jwt', role: 'organiser', name: 'Paras' })
  globalThis.fetch = serverReturns(trips)
})

test('greets the organiser by name', () => {
  showTrips()
  expect(screen.getByRole('heading', { name: 'Hi Paras' })).toBeTruthy()
})

test('lists every trip with a link to it', async () => {
  showTrips()
  expect(await screen.findByText('Japan')).toBeTruthy()
  expect(screen.getByText('Bali')).toBeTruthy()
  expect(screen.getByText('Japan').closest('a').getAttribute('href')).toBe('/trips/t1')
})

test('shows a friendly message when there are no trips yet', async () => {
  globalThis.fetch = serverReturns([])
  showTrips()
  expect(await screen.findByText(/No trips yet/)).toBeTruthy()
})

test('opens the trip form when New trip is clicked', () => {
  showTrips()
  fireEvent.click(screen.getByRole('button', { name: 'New trip' }))
  expect(screen.getByRole('heading', { name: 'New trip' })).toBeTruthy()
})

// Here CREATE: the new trip is sent to the server and the app opens it
test('creates a trip and opens its page', async () => {
  showTrips()
  await screen.findByText('Japan')
  globalThis.fetch = serverReturns({ _id: 't3', title: 'Fiji' }, 201)

  fireEvent.click(screen.getByRole('button', { name: 'New trip' }))
  fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Fiji' } })
  fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Nadi' } })
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-08-01' } })
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-08-07' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Trip page')).toBeTruthy()
  const [url, options] = fetch.mock.calls[0]
  expect(url).toBe('/api/trips')
  expect(options.method).toBe('POST')
})

// Here the list still opens offline from the copy saved last time
test('shows the saved trips and a banner when offline', async () => {
  showTrips()
  await screen.findByText('Japan') // online: this saves the list
  screen.unmount?.()
  document.body.innerHTML = ''

  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  globalThis.fetch = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  showTrips()

  expect(await screen.findByText('Japan')).toBeTruthy()
  expect(screen.getByText('You are offline. Showing your saved trips.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'New trip' }).disabled).toBe(true)
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

test('shows the error when the trips cannot be loaded', async () => {
  globalThis.fetch = serverReturns({ error: 'Only the organiser can do this' }, 403)
  showTrips()
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Only the organiser can do this'))
})

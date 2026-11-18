import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { saveSession } from '../src/services/api'
import App from '../src/App'

// Here I test the routes in App.jsx: which page each person sees first

function showApp(path) {
  render(
    <GoogleOAuthProvider clientId="test">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }))
})

test('someone who is not signed in sees the login page', () => {
  showApp('/')
  expect(screen.getByRole('heading', { name: 'One trip plan for the whole group.' })).toBeTruthy()
})

test('an organiser sees the list of their trips', () => {
  saveSession({ token: 'jwt', role: 'organiser', name: 'Paras' })
  showApp('/')
  expect(screen.getByRole('heading', { name: 'Hi Paras' })).toBeTruthy()
})

// Here a traveller only has one trip, so they go straight to it
test('a traveller goes straight to their trip', async () => {
  saveSession({ token: 'jwt', role: 'traveller', tripId: 't1' })
  showApp('/')
  expect(await screen.findByText('Loading trip...')).toBeTruthy()
  expect(fetch.mock.calls[0][0]).toBe('/api/trips/t1')
})

// Here the Protected route sends people who are not signed in back to the login page
test('a trip page is not shown to someone who is not signed in', () => {
  showApp('/trips/t1')
  expect(screen.getByRole('heading', { name: 'Joining a trip?' })).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
})

test('an unknown address goes back to the first page', () => {
  showApp('/something-wrong')
  expect(screen.getByRole('heading', { name: 'Joining a trip?' })).toBeTruthy()
})

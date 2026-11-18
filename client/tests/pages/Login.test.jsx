import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { getSession } from '../../src/services/api'
import Login from '../../src/pages/Login'

// Here I test the login page: the invite code for travellers and the Google button for organisers

function showLogin() {
  render(
    <GoogleOAuthProvider clientId="test">
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function join(code) {
  fireEvent.change(screen.getByLabelText('Invite code'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Join trip' }))
}

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn()
})

test('shows both ways in: invite code and Google sign in', () => {
  showLogin()
  expect(screen.getByRole('heading', { name: 'Joining a trip?' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Planning a trip?' })).toBeTruthy()
})

// Here a wrong code is stopped in the browser, so the server is not asked
test('shows a message for a wrong code and does not call the server', async () => {
  showLogin()
  join('ABC')
  expect(await screen.findByText(/8 letters and numbers/)).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
})

test('asks for the code when the box is empty', async () => {
  showLogin()
  join('')
  expect(await screen.findByText('Please type the invite code from the organiser')).toBeTruthy()
})

// Here a correct code is sent to the server and the traveller session is saved
test('joins the trip with a correct code and saves the session', async () => {
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ role: 'traveller', tripId: 't1', token: 'jwt' }),
  })
  showLogin()
  join(' a1b2c3d4 ')

  await waitFor(() => expect(getSession()?.role).toBe('traveller'))
  const [url, options] = fetch.mock.calls[0]
  expect(url).toBe('/api/auth/join')
  expect(JSON.parse(options.body)).toEqual({ code: 'a1b2c3d4' }) // spaces removed
})

test('shows the server message when the code does not exist', async () => {
  fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Invite code not found' }) })
  showLogin()
  join('A1B2C3D4')
  expect(await screen.findByText('Invite code not found')).toBeTruthy()
  expect(getSession()).toBeNull()
})

test('explains when TripMate cannot be reached', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'))
  showLogin()
  join('A1B2C3D4')
  expect(await screen.findByText('Could not reach TripMate. Check your connection.')).toBeTruthy()
})

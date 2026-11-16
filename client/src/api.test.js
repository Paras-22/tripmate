import 'fake-indexeddb/auto'
import { api, getSession, getWithOffline, saveSession, signOut } from './api'
import { loadOffline, saveOffline } from './offlineDB'

// Here I test api.js: the one place where the frontend talks to the server

// Here I make a fake server answer, so the tests do not need the real server
const answer = (status, data) => vi.fn(async () => ({ ok: status < 400, status, json: async () => data }))
const noInternet = () =>
  vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = answer(200, { title: 'Japan' })
})

describe('session', () => {
  test('saves the signed in user and reads it back', () => {
    saveSession({ name: 'Paras', role: 'organiser', token: 'abc' })
    expect(getSession()).toEqual({ name: 'Paras', role: 'organiser', token: 'abc' })
  })

  test('gives null when nobody is signed in', () => {
    expect(getSession()).toBeNull()
  })

  // Here sign out must also remove the saved trips, so the next person on the phone cannot see them
  test('sign out removes the user and the saved trips', async () => {
    saveSession({ token: 'abc' })
    await saveOffline('/trips/1', { title: 'Japan' })
    await signOut()
    expect(getSession()).toBeNull()
    expect(await loadOffline('/trips/1')).toBeUndefined()
  })
})

describe('api', () => {
  // Here every request must carry the JWT, or the server answers 401
  test('adds the JWT to the request', async () => {
    saveSession({ token: 'my-token' })
    await api('/trips')
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/trips')
    expect(options.headers.Authorization).toBe('Bearer my-token')
  })

  test('sends the body as JSON', async () => {
    await api('/trips', 'POST', { title: 'Japan' })
    const options = fetch.mock.calls[0][1]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ title: 'Japan' })
  })

  // Here the page needs the status to know if the server answered or the internet is down
  test('throws the server message with its status', async () => {
    globalThis.fetch = answer(403, { error: 'Only the organiser can do this' })
    await expect(api('/trips')).rejects.toMatchObject({ message: 'Only the organiser can do this', status: 403 })
  })

  // Here an expired JWT signs the user out and sends them back to the login page
  test('signs the user out when the server says 401', async () => {
    saveSession({ token: 'old-token' })
    globalThis.fetch = answer(401, { error: 'Please sign in again' })
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })

    await expect(api('/trips')).rejects.toThrow('Please sign in again')
    expect(getSession()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/')
    vi.unstubAllGlobals()
  })
})

describe('getWithOffline (Proxy)', () => {
  test('gives the server data and saves a copy on the phone', async () => {
    const result = await getWithOffline('/trips/t1')
    expect(result).toEqual({ data: { title: 'Japan' }, offline: false })
    expect(await loadOffline('/trips/t1')).toEqual({ title: 'Japan' })
  })

  test('gives the saved copy when there is no internet', async () => {
    await getWithOffline('/trips/t1') // online: this saves the trip
    globalThis.fetch = noInternet()
    const result = await getWithOffline('/trips/t1')
    expect(result).toEqual({ data: { title: 'Japan' }, offline: true })
  })

  // Here a real error like 403 must be shown, not hidden behind an old saved copy
  test('does not hide a real server error behind the saved copy', async () => {
    await getWithOffline('/trips/t1')
    globalThis.fetch = answer(403, { error: 'You are not part of this trip' })
    await expect(getWithOffline('/trips/t1')).rejects.toThrow('not part of this trip')
  })

  test('explains when there is no internet and nothing was saved', async () => {
    globalThis.fetch = noInternet()
    await expect(getWithOffline('/trips/never-opened')).rejects.toThrow('You are offline and this has not been saved yet')
  })
})

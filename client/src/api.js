import { clearOffline, loadOffline, saveOffline } from './offlineDB'
import { turnOffAlerts } from './push'

// Here I keep the signed in user and JWT in localStorage so the app still opens offline
export const getSession = () => JSON.parse(localStorage.getItem('session'))
export const saveSession = (session) => localStorage.setItem('session', JSON.stringify(session))

// Here sign out also removes the saved trips and alerts from this device
export async function signOut() {
  localStorage.removeItem('session')
  await Promise.all([clearOffline(), turnOffAlerts()])
}

// Here all API calls go through one function that adds the JWT
export async function api(path, method = 'GET', body) {
  const session = getSession()
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session && { Authorization: `Bearer ${session.token}` }),
    },
    body: body && JSON.stringify(body),
  })
  const data = await response.json()

  // Here an expired JWT sends the user back to the login page
  if (response.status === 401 && session) {
    await signOut()
    location.assign('/')
  }
  if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status })
  return data
}

// Here I did the offline logic: use the server when I can and save the answer,
// and when there is no connection use the last saved answer from IndexedDB.
export async function getWithOffline(path) {
  try {
    const data = await api(path)
    await saveOffline(path, data)
    return { data, offline: false }
  } catch (error) {
    if (error.status) throw error // the server answered with a real error
    const data = await loadOffline(path)
    if (!data) throw new Error('You are offline and this has not been saved yet')
    return { data, offline: true }
  }
}

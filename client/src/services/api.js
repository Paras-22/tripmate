import { clearOffline, loadOffline, saveOffline } from './offlineDB'
import { turnOffAlerts } from './push'

// Here I keep the signed in user and JWT in localStorage so the app still opens offline
export const getSession = () => JSON.parse(localStorage.getItem('session'))
export const saveSession = (session) => localStorage.setItem('session', JSON.stringify(session))

// Here I also remove the saved trips and alerts from this device on sign out
export async function signOut() {
  localStorage.removeItem('session')
  await Promise.all([clearOffline(), turnOffAlerts()])
}

// Here I send all API calls through one function that adds the JWT
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

  // Here I send the user back to the login page when the JWT has expired
  if (response.status === 401 && session) {
    await signOut()
    location.assign('/')
  }
  if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status })
  return data
}

// Here I used the Proxy pattern for reading data. The pages ask this proxy instead of
// the server. The proxy uses the server when it can and saves the answer, and when there
// is no connection it gives back the last saved answer from IndexedDB. The pages do not
// need to know if the data came from the server or from the phone.
export async function getWithOffline(path) {
  try {
    const data = await api(path)
    await saveOffline(path, data)
    return { data, offline: false }
  } catch (error) {
    if (error.status) throw error // here I show a real error when the server answered
    const data = await loadOffline(path)
    if (!data) throw new Error('You are offline and this has not been saved yet')
    return { data, offline: true }
  }
}

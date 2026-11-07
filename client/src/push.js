// Here I change the VAPID public key from text into the bytes the browser needs
function keyToBytes(base64Key) {
  const base64 = base64Key.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0))
}

// Here I check if this device already has alerts turned on
export async function getSubscription() {
  const registration = await navigator.serviceWorker?.getRegistration()
  return registration?.pushManager?.getSubscription() ?? null
}

// Here I ask for permission and create the subscription that I send to the server
export async function createSubscription() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked in this browser')

  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyToBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })
}

export async function turnOffAlerts() {
  const subscription = await getSubscription()
  await subscription?.unsubscribe()
}

import { createSubscription, getSubscription, turnOffAlerts } from './push'

// Here I test push.js. The test browser has no real push service,
// so I give it a fake service worker and a fake Notification.

const subscription = { endpoint: 'https://push.example/1', unsubscribe: vi.fn() }
const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn(async () => subscription) }
const registration = { pushManager }

function fakeBrowser({ permission = 'granted', hasServiceWorker = true } = {}) {
  vi.stubGlobal('Notification', { requestPermission: vi.fn(async () => permission) })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: hasServiceWorker ? { ready: Promise.resolve(registration), getRegistration: async () => registration } : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('createSubscription', () => {
  test('asks for permission and subscribes with the VAPID public key', async () => {
    fakeBrowser()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID') // base64 for the bytes 1, 2, 3

    expect(await createSubscription()).toBe(subscription)

    const options = pushManager.subscribe.mock.calls[0][0]
    expect(options.userVisibleOnly).toBe(true)
    // Here I check keyToBytes turned the text key into the bytes the browser needs
    expect([...options.applicationServerKey]).toEqual([1, 2, 3])
  })

  // Here the key is base64url, with - and _ instead of + and /
  test('reads a base64url key with - and _ correctly', async () => {
    fakeBrowser()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '-_8')
    await createSubscription()
    expect([...pushManager.subscribe.mock.calls[0][0].applicationServerKey]).toEqual([251, 255])
  })

  test('stops with a clear message when the user blocks notifications', async () => {
    fakeBrowser({ permission: 'denied' })
    await expect(createSubscription()).rejects.toThrow('Notifications are blocked in this browser')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })
})

describe('getSubscription', () => {
  test('gives the saved subscription when alerts are on', async () => {
    fakeBrowser()
    pushManager.getSubscription.mockResolvedValue(subscription)
    expect(await getSubscription()).toBe(subscription)
  })

  // Here an old browser with no service worker must not crash the page
  test('gives null when the browser has no service worker', async () => {
    fakeBrowser({ hasServiceWorker: false })
    expect(await getSubscription()).toBeNull()
  })
})

describe('turnOffAlerts', () => {
  test('unsubscribes this device', async () => {
    fakeBrowser()
    pushManager.getSubscription.mockResolvedValue(subscription)
    await turnOffAlerts()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  test('does nothing when alerts were never turned on', async () => {
    fakeBrowser()
    pushManager.getSubscription.mockResolvedValue(null)
    await expect(turnOffAlerts()).resolves.toBeUndefined()
  })
})

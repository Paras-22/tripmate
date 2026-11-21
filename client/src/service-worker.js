const CACHE_NAME = 'tripmate-v1'

// Here I get the list of all built files from the PWA plugin, so the whole app works offline
const APP_FILES = self.__WB_MANIFEST.map((file) => file.url)

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Here I did the caching. API calls are skipped because IndexedDB keeps the trip data.
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) {
    return
  }

  // Here for pages I try the network first, and when offline I open the saved app
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Here for files I use the saved copy first, because the build gives each version a new name.
  // If a file is not saved and there is no internet, I answer with the saved app.
  event.respondWith(
    caches
      .match(request)
      .then((saved) => saved || fetch(request))
      .catch(() => caches.match('/index.html')),
  )
})

// Here I show the alert and tell any open page to load the new plan
self.addEventListener('push', (event) => {
  const { title, body, url } = event.data.json()

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        data: { url },
      })
      const pages = await self.clients.matchAll({ type: 'window' })
      pages.forEach((page) => page.postMessage('trip-updated'))
    })(),
  )
})

// Here I open that trip when the alert is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data.url))
})

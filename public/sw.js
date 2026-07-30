const CACHE_NAME = 'guangyao-skin-v4'
const BASE_PATH = new URL(self.registration.scope).pathname
const fromBase = (path = '') => `${BASE_PATH}${path}`
const APP_SHELL = [
  fromBase(),
  fromBase('index.html'),
  fromBase('manifest.webmanifest'),
  fromBase('icons/icon-192.png'),
  fromBase('icons/icon-512.png')
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => cached ?? caches.match(fromBase('index.html')))

      return cached ?? network
    })
  )
})

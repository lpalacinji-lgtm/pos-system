// Service Worker mínimo: cache de shell de la app, network-first para datos
const CACHE = 'pos-v1'
const SHELL = ['/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  // Network-first para Supabase y APIs
  if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)))
    return
  }
  // Cache-first para estáticos
  e.respondWith(caches.match(request).then((r) => r || fetch(request)))
})

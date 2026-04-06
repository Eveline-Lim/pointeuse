// Pointeuse Pro - Service Worker v4
// Network-first strategy: always try network, fall back to cache
const CACHE = 'pointeuse-v4';
const CORE = ['./index.html', './manifest.json'];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install on cache failure
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  // Only handle GET requests for same-origin resources
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    fetch(ev.request)
      .then(res => {
        // Update cache with fresh response
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(ev.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});

// Bump this on every edit to index.html/css/assets, or an installed app
// keeps serving the old version forever (cache-first navigation).
const CACHE = 'vx-2026-08-18-2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './fonts/Anton-Regular.ttf',
  './fonts/JetBrainsMono-Medium.ttf'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// index.html asks for this once at boot (askSwVersion()) instead of keeping
// its own hardcoded copy of CACHE — one source of truth for the build
// version shown in Settings, so it can't drift from what's actually running.
self.addEventListener('message', (e) => {
  if (e.data === 'GET_VERSION') e.source.postMessage({ type: 'VERSION', version: CACHE });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch non-GET, and never cache cross-origin.
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  // Never cache the API — it returns LIVE data from the server (Supabase
  // behind Express). Cache-first here would silently serve stale
  // workouts/meals/programs. Network-only, no caches.put, ever.
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        if (resp && resp.ok) {
          caches.open(CACHE).then(c => c.put(req, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

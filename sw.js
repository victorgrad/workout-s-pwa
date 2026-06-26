/* =====================================================================
   sw.js — stale-while-revalidate service worker (offline support).
   Bump CACHE on every change (keep it in sync with APP_VERSION in
   data.js) so you can tell which build a phone is actually running.
   ===================================================================== */

const CACHE = 'workout-v1.0.0';

/* App shell — everything needed to run fully offline. Relative paths so
   it works from any subpath (e.g. GitHub Pages project sites). */
const ASSETS = [
  '.',
  'index.html',
  'css/styles.css',
  'js/data.js',
  'js/store.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });

      // kick off a background refresh
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      // serve cache instantly; revalidate in the background
      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      // not cached yet — go to network, fall back to the app shell offline
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') {
        return (
          (await cache.match('index.html')) ||
          (await cache.match('.')) ||
          new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        );
      }
      return new Response('', { status: 504, statusText: 'offline' });
    })()
  );
});

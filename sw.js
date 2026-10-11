// Bump CACHE when any app file changes so phones pick up the new version.
const CACHE = 'gymbud-v8';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'routines.js', 'food.js', 'progress.js', 'main.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'img/muscles/chest.jpg', 'img/muscles/back.jpg', 'img/muscles/shoulders.jpg', 'img/muscles/biceps.jpg',
  'img/muscles/triceps.jpg', 'img/muscles/quads.jpg', 'img/muscles/hamstrings.jpg',
  'img/muscles/calves.jpg', 'img/muscles/core.jpg',
  'img/muscles/forearms.jpg', 'img/muscles/glutes.jpg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (revalidated every time) so updates arrive when online; falls back to the cache offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: always revalidate with the server, so a new deploy shows up straight away
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

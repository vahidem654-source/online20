/*
  Minimal service worker — only caches the app shell itself (this file,
  index.html, manifest, icons) so the teacher's builder app can be
  installed and reopened without a network connection.

  Student exam links (?exam=...&d=...) and anything else with a query
  string are deliberately left untouched here and go straight to the
  network like normal, so a stale cached copy can never serve an old
  or wrong exam. Standalone downloaded exam files don't go through a
  service worker at all — they work offline on their own already.
*/
const CACHE_NAME = 'azmoon-saz-shell-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(()=>{ /* fine if some assets 404 — caching is best-effort */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.search) return; // exam links / anything with a query string — always go to network

  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

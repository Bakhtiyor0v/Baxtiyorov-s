// Oddiy offline kesh: sahifa internet sekin bo'lsa ham tez ochiladi
const CACHE = 'carone-v1';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/search.js', 'js/scan.js', 'js/app.js', 'icons/icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Avval tarmoq, bo'lmasa kesh
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});

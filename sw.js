/* Offline kesh: sayt sekin internetda ham tez ochiladi. Versiyani o'zgartirsangiz kesh yangilanadi. */
const CACHE = 'carone-v2';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'assets/icon.svg',
  'js/core/config.js', 'js/core/store.js', 'js/core/i18n.js', 'js/data/catalog.js', 'integrations/bito/mapping.js',
  'js/core/api.js', 'js/core/search.js', 'js/core/scan.js', 'js/ui/icons.js', 'js/ui/components.js',
  'js/views/listing.js', 'js/views/home.js', 'js/views/catalog.js', 'js/views/product.js', 'js/views/scan.js',
  'js/views/cart.js', 'js/views/account.js', 'js/app.js',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Avval tarmoq (yangi narxlar), bo'lmasa kesh
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});

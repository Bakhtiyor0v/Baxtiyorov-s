/* Eski CarOne do'kon saytining service worker'i o'rnida.
   Telefonlarda qolib ketgan eski keshni tozalaydi va o'zini o'chiradi. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('carone-')) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));

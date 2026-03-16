// Kill-switch service worker — replaces the old workbox PWA service worker.
// When the browser fetches this updated sw.js, it installs immediately,
// activates, clears all old caches, and unregisters itself.
// This ensures users always get the latest build from the server.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => client.navigate(client.url));
    })
  );
});

// Shows notifications outside the app and brings the app back when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all.find((c) => 'focus' in c);
    if (client) {
      await client.focus();
      client.postMessage({ type: 'notification-click', ...data });
    } else {
      await self.clients.openWindow('/');
    }
  })());
});
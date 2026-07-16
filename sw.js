/* v1 is retired in favor of /v2/ - this is now a kill switch. It clears
   every v1 cache, unregisters itself, and reloads any open v1 clients so
   they land on the redirect stubs (which forward into v2) instead of
   staying trapped on a stale offline-cached v1 page. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      }),
  );
});

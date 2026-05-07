// Service Worker – OPERATION: RNG
// Strategie: Network-First mit Cache-Fallback.
// skipWaiting + clients.claim sorgen dafür, dass Updates sofort greifen
// ohne dass alle Nutzer manuell neuladen müssen.

const CACHE_NAME = "op-rng-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/data.js",
  "./assets/js/firebase.js",
  "./assets/js/game.js",
  "./assets/js/sound.js",
  "./assets/js/squad.js",
  "./assets/js/storage.js",
  "./assets/js/ui.js",
  "./assets/js/wheel.js",
  "./assets/js/vagari.js",
];

self.addEventListener("install", (event) => {
  // Sofort übernehmen, nicht auf andere Tabs warten
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  // Alle alten Caches löschen
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Nur GET-Requests cachen, keine externen Requests (Firebase, Google Fonts)
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.origin === self.location.origin) {
    return;
  }

  // Firebase & externe URLs: immer direkt ans Netz
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("googleapis")
  ) {
    return;
  }

  // Network-First: frisch vom Netz holen, bei Fehler Cache nutzen
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

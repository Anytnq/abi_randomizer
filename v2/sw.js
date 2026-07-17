/* v2 Service Worker (Planungs.md 5.9, 8). Registers with scope /v2/ - the
   v1 service worker at the repo root keeps handling everything outside
   that path, browsers pick the more specific scope automatically, so the
   two coexist without conflict. Same network-first + offline-fallback
   strategy as v1's sw.js (proven pattern, not reinvented), but only
   precaches the Hub + Randomizer critical path. Wheel/Squad/GunGame/
   Miesmuschel and Firebase get cached on first real visit instead of at
   install, so Firebase is never force-downloaded before Squad is opened
   (Planungs.md 8: "Firebase nur beim Öffnen von Squad laden"). */

const BUILD_VERSION = "v2-2026-07-17-slot-reels-01";
const CACHE_NAME = `op-rng-${BUILD_VERSION}`;
const OFFLINE_URL = "./offline.html";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./assets/styles/tokens.css",
  "./assets/styles/reset.css",
  "./assets/styles/base.css",
  "./assets/styles/shell.css",
  "./assets/styles/components/button.css",
  "./assets/styles/components/card.css",
  "./assets/styles/components/game-tile.css",
  "./assets/styles/components/loadout-card.css",
  "./assets/styles/components/event-overlay.css",
  "./assets/styles/components/sheet.css",
  "./assets/styles/views/hub.css",
  "./assets/styles/views/randomizer.css",
  "./assets/styles/views/filters.css",
  "./assets/js/app/bootstrap.js",
  "./assets/js/app/router.js",
  "./assets/js/app/store.js",
  "./assets/js/app/app-store.js",
  "./assets/js/views/hub-view.js",
  "./assets/js/views/randomizer-view.js",
  "./assets/js/views/filters-view.js",
  "./assets/js/core/randomizer-engine.js",
  "./assets/js/core/filters.js",
  "./assets/js/core/storage.js",
  "./assets/js/components/event-overlay.js",
  "./assets/js/components/sheet.js",
  "../assets/js/randomizer/game.js",
  "../assets/js/randomizer/data.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isExternalRealtimeRequest(url) {
  return (
    url.hostname.includes("firebase") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("googleapis")
  );
}

async function networkFirst(request, options = {}) {
  const { noStore = false } = options;
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, noStore ? { cache: "no-store" } : undefined);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match(OFFLINE_URL);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isExternalRealtimeRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, { noStore: true }));
    return;
  }

  const isStaticFile = /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|json)$/i.test(
    url.pathname,
  );

  if (isStaticFile) {
    event.respondWith(networkFirst(request, { noStore: true }));
    return;
  }

  event.respondWith(networkFirst(request));
});

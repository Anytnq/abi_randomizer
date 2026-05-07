const BUILD_VERSION = "2026-05-07-04";
const CACHE_NAME = `op-rng-${BUILD_VERSION}`;
const OFFLINE_URL = "./offline.html";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./assets/css/styles.css",
  "./assets/js/app.js?v=20260507-4",
  "./assets/js/data.js",
  "./assets/js/firebase.js",
  "./assets/js/game.js",
  "./assets/js/sound.js",
  "./assets/js/squad.js?v=20260507-4",
  "./assets/js/squad-utils.js?v=20260507-4",
  "./assets/js/storage.js",
  "./assets/js/ui.js",
  "./assets/js/wheel.js",
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
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
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
    const response = await fetch(
      request,
      noStore ? { cache: "no-store" } : undefined,
    );
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return cache.match(OFFLINE_URL);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isExternalRealtimeRequest(url)) {
    return;
  }

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

const BUILD_VERSION = "2026-07-08-01";
const CACHE_NAME = `op-rng-${BUILD_VERSION}`;
const OFFLINE_URL = "./offline.html";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./randomizer.html",
  "./gungame.html",
  "./muschel.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/css/styles.css",
  "./assets/audio/i-need-a-hero.mp3",
  "./assets/js/randomizer/app.js?v=20260708-1",
  "./assets/js/randomizer/data.js",
  "./assets/js/firebase.js",
  "./assets/js/randomizer/game.js",
  "./assets/js/randomizer/responsive-layout.js",
  "./assets/js/gungame/data.js",
  "./assets/js/gungame/gungame.js",
  "./assets/js/muschel/app.js",
  "./assets/js/randomizer/sound.js",
  "./assets/js/randomizer/squad.js?v=20260708-1",
  "./assets/js/randomizer/squad-ui.js",
  "./assets/js/randomizer/squad-utils.js?v=20260708-1",
  "./assets/js/randomizer/storage.js",
  "./assets/js/randomizer/ui.js",
  "./assets/js/randomizer/wheel.js",
  "./assets/js/utils.js",
  "./assets/js/volume-control.js",
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
  if (isExternalRealtimeRequest(url)) {
    return;
  }

  if (url.origin !== self.location.origin) {
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

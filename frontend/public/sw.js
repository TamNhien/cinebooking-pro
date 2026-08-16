const VERSION = "v26";
const SHELL_CACHE = `cinebooking-shell-${VERSION}`;
const RUNTIME_CACHE = `cinebooking-runtime-${VERSION}`;
const IMAGE_CACHE = `cinebooking-images-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
const APP_SHELL = [
  "/",
  "/offline",
  "/offline-tickets",
  "/bookings",
  "/movies",
  "/cinemas",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png"
];

async function cachePageAndAssets(cache, path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return;
    await cache.put(path, response.clone());
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return;
    const html = await response.text();
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)].map(m => m[1]);
    await Promise.all([...new Set(matches)].map(async asset => {
      try {
        const res = await fetch(asset, { cache: "no-store" });
        if (res.ok) await cache.put(asset, res);
      } catch {}
    }));
  } catch {}
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map(path => cachePageAndAssets(cache, path)));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("cinebooking-") && !ALL_CACHES.includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      await Promise.all(data.urls.filter(Boolean).map(url => cachePageAndAssets(cache, url)));
    })());
  }
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request) || await caches.match(new URL(request.url).pathname);
    if (cached) return cached;
    return await caches.match(fallbackPath || "/offline");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated/API responses are deliberately never cached by the service worker.
  // Offline tickets are persisted explicitly in IndexedDB after the user opts in.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/offline"));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icon")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === "image" || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

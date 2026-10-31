/* Only application files are cached. Private records stay in IndexedDB. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (request.mode === "navigate") {
        const shell = await cache.match(BASE + "index.html");
        return shell || fetch(request);
      }
      // Cached files are public app assets. Ignore server Vary: Origin on same-origin module requests.
      const cached = await cache.match(request, {
        ignoreSearch: true,
        ignoreVary: true,
      });
      return cached || fetch(request);
    })(),
  );
});

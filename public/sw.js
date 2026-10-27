// Elimu service worker. It only shows a friendly page when a teacher opens Elimu with
// no connection. Pages and data are never cached here: they are private and change often.
const CACHE = "elimu-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.add(new Request(OFFLINE_URL, { cache: "reload" })),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      // Start the page request while the worker wakes up, so pages don't load slower.
      if (self.registration.navigationPreload)
        await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
  );
});

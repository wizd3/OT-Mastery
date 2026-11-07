/* OT Mastery service worker.
   Cache-first app shell. To force every user onto a new release, change CACHE below. */
const CACHE = "ot-mastery-v4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // external links are never intercepted

  if (req.mode === "navigate") {
    // App shell: serve cached page instantly, refresh it in the background for next launch.
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match("./index.html").then((cached) => {
          const refresh = fetch("./index.html", { cache: "no-cache" })
            .then((res) => { if (res && res.ok) cache.put("./index.html", res.clone()); return res; })
            .catch(() => null);
          return cached || refresh.then((res) => res || new Response("Offline and not yet cached.", { status: 503, headers: { "Content-Type": "text/plain" } }));
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

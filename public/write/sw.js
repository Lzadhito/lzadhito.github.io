// Scope: /write/ only. The page itself is network-first (an online open always gets the newest app, falling back
// to the cache when offline or slow); hashed /_astro/ assets and the /fonts/ never change under the same name, so
// they are cache-first. GitHub API calls are never intercepted.
const CACHE = "composer-v2";
const SLOW_MS = 3000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/write/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(cache, req) {
  const cached = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  if (!cached) return net;
  net.catch(() => {}); // if the cache wins the race, a later failure here is not an error
  return Promise.race([net, new Promise((r) => setTimeout(() => r(cached), SLOW_MS))]).catch(() => cached);
}

async function cacheFirst(cache, req) {
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const immutable = url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/fonts/");
  if (!immutable && !url.pathname.startsWith("/write/")) return;
  e.respondWith(caches.open(CACHE).then((cache) => (immutable ? cacheFirst(cache, req) : networkFirst(cache, req))));
});

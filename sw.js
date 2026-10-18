/* Щоб застосунок відкривався і без інтернету (дані — окремо, у сховищі). */
const CACHE = "kitchen-v31";
const SHELL = ["./", "index.html", "styles.css", "manifest.webmanifest", "js/portions.js", "js/nutrition.js", "js/art.js", "js/seed.js", "js/firebase-config.js", "js/store.js", "js/cloud.js", "js/app.js", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* спершу мережа (щоб оновлення приходили одразу), без мережі — збережена копія */
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    // no-cache: завжди питаємо сервер, чи є нова версія (інакше браузер 10 хв віддає стару)
    fetch(e.request.url, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./")))
  );
});

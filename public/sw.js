/* ARED service worker: keeps the shell and recently seen pages and images available on poor connections. */
const VERSION = "ared-v2";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/admin") || url.pathname.endsWith(".mp4")) return;

  if (req.mode === "navigate") {
    // Never persist navigation HTML: even public URLs can contain account controls.
    // Version activation purges the previous cache of member pages.
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (/\.(?:png|jpe?g|webp|svg|css|js|woff2?)$/.test(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    // Stale while revalidate for static files.
    e.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

// Offline shell.
//
// Everything the app is made of — the HTML, the CSS, every module, the manifest
// — goes to the network first, with `cache: "reload"` so the request reaches the
// origin rather than the browser's own HTTP cache. That flag is the whole point:
// GitHub Pages sends max-age=600, and a worker's plain fetch() honours it, so
// "network first" without it quietly serves a ten-minute-old file. A redeploy
// changes the shell and the code together, and half a build is worse than an
// old one.
//
// Fonts, the mark, the photographs and the icons change name when they change
// at all, so they are cache-first and precached on install.
//
// clients.claim() runs only when this worker REPLACES an older one. On a cold
// install the page keeps the network it started with — claiming mid-flight hands
// the new worker every in-flight image request, and they fail.
//
// build.py writes VERSION and both lists; do not edit them by hand.

const VERSION = "basil-08794052bb";
const MARKER = "./__installed__";

const SHELL = [
  /* shell:start */
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/boot.js",
  "./js/brand.js",
  "./js/chrome.js",
  "./js/config.js",
  "./js/crm.js",
  "./js/data.js",
  "./js/doodles.js",
  "./js/icons.js",
  "./js/install.js",
  "./js/jalali.js",
  "./js/motion.js",
  "./js/photos.js",
  "./js/qr.js",
  "./js/router.js",
  "./js/store.js",
  "./js/theme.js",
  "./js/ui.js",
  "./js/util.js",
  "./js/views/bag.js",
  "./js/views/home.js",
  "./js/views/menu.js",
  "./js/views/order.js",
  "./js/views/profile.js",
  "./js/views/reserve.js",
  "./js/views/staff.js",
  "./js/views/stamps.js",
  /* shell:end */
];
const ASSETS = [
  /* assets:start */
  "./assets/brand/alpha-black.png",
  "./assets/brand/alpha-white.png",
  "./assets/brand/basil-disc.svg",
  "./assets/brand/basil-mark.svg",
  "./assets/fonts/bricolage.woff2",
  "./assets/fonts/yekan-bold.woff2",
  "./assets/fonts/yekan.woff2",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-512.png",
  "./assets/photos/bowl-sm.webp",
  "./assets/photos/focaccia-sm.webp",
  "./assets/photos/focaccia-sq-sm.webp",
  "./assets/photos/guest-sm.webp",
  "./assets/photos/kiosk-sm.webp",
  "./assets/photos/pepperoni-sm.webp",
  "./assets/photos/pepperoni-sq-sm.webp",
  "./assets/photos/pizza-ham-sm.webp",
  "./assets/photos/pizza-ham-sq-sm.webp",
  "./assets/photos/storefront-sm.webp",
  "./assets/photos/tray-sm.webp",
  /* assets:end */
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const had = (await caches.keys()).some((k) => k.startsWith("basil-") && k !== VERSION);
    const cache = await caches.open(VERSION);
    await Promise.allSettled([...SHELL, ...ASSETS].map((url) => cache.add(url)));
    // whether this is an update or a first install is recorded in the cache
    // itself — install and activate need not share a worker instance
    await cache.put(MARKER, new Response(had ? "update" : "cold"));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    const marker = await (await caches.open(VERSION)).match(MARKER);
    if ((marker ? await marker.text() : "cold") === "update") await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/__installed__")) return;
  if (request.headers.has("range")) return;

  const networkFirst = async () => {
    try {
      const res = await fetch(new Request(request, { cache: "reload" }));
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch {
      const hit = (await caches.match(request, { ignoreSearch: true }))
        || (request.mode === "navigate" ? await caches.match("./index.html") : null);
      return hit || Response.error();
    }
  };

  if (request.mode === "navigate" || /\.(?:html|css|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/")) {
    e.respondWith(networkFirst());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});

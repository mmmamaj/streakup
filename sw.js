const CACHE_NAME = "riseup-v11-online";
const APP_SHELL = ["/", "/index.html", "/login.html", "/perfil.html", "/chat.html", "/configuracoes.html", "/assets/js/script.js", "/assets/js/theme.js", "/assets/css/theme-fix.css", "/assets/js/notifications.js", "/assets/images/riseup-logo.png", "/assets/js/login.js", "/assets/js/reels.js", "/assets/js/chat.js", "/assets/js/settings.js", "/manifest.json", "/assets/images/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && url.origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html"))));
});

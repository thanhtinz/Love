/* Khu Vườn Tình Yêu — Service Worker (V4)
   Mục đích: đủ điều kiện cài PWA (installable) + cache app shell cơ bản.
   Chiến lược: same-origin = network-first, lỗi mạng thì dùng cache.
   Cross-origin (Supabase API/Realtime...) = KHÔNG can thiệp, để trình duyệt tự xử lý qua mạng. */
const CACHE = "khu-vuon-v1";
const SHELL = ["/", "/manifest.json", "/icon.svg", "/icons/icon-192", "/icons/icon-512", "/icons/apple-touch-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
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
  if (url.origin !== self.location.origin) return; // Supabase / bên thứ ba: pass-through mạng, không cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});

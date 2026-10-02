const CACHE = "naomi-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/v1")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.pathname !== "/sw.js") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "Naomi Music";
  const body = data.body || "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag || "naomi-msg",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) {
          c.focus();
          if ("navigate" in c) c.navigate(self.location.origin + target);
          return;
        }
      }
      return self.clients.openWindow(self.location.origin + target);
    })
  );
});

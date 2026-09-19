self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const aba of abas) {
        if (aba.url.includes("/admin") && "focus" in aba) return aba.focus();
      }
      return self.clients.openWindow("/admin");
    })()
  );
});
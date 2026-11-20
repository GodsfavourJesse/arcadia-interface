const CACHE_NAME = "miyor-shell-v1";
self.addEventListener("install", (event) => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "You have a new Miyor notification." }; }
  const title = payload.title || (payload.kind === "incoming-call" ? "Incoming Miyor call" : "Miyor");
  const options = {
    body: payload.body || "Open Miyor to see what's new.",
    icon: payload.icon || "/icons/miyor.svg",
    badge: "/icons/miyor.svg",
    tag: payload.kind === "incoming-call" ? `call-${payload.callId}` : (payload.tag || "miyor-update"),
    renotify: true,
    data: { url: payload.url || "/dashboard", kind: payload.kind || "message", callId: payload.callId },
    actions: payload.kind === "incoming-call" ? [{ action: "open", title: "Open call" }] : []
  };
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const visibleWindow = windows.find((client) => client.visibilityState === "visible");
    if (visibleWindow) { visibleWindow.postMessage({ type: "MIYOR_PUSH", payload }); return; }
    const badge = self.registration.setAppBadge ? self.registration.setAppBadge(1).catch(() => undefined) : Promise.resolve();
    return Promise.all([self.registration.showNotification(title, options), badge]);
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if ("focus" in client) { client.navigate(target); return client.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});

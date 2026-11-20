// The Supabase project address and its public keys. All of these are meant to be public:
// the database's own rules decide what each signed-in person can see or change.
if (typeof window !== "undefined") {
  window.BB_CONFIG = { url: "https://ujbmltqtejembpwbqxqh.supabase.co", anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqYm1sdHF0ZWplbWJwd2JxeHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxODcyMTksImV4cCI6MjExMDc2MzIxOX0.Eb33PMOKez0W_E2Eu_3PS1hIgCAKKhZAwNi0R__l7dM", vapid: "BG-TpJyvdBoEfTq88npGDlHjizXPvOB6GkHgJXaz5gYsYTUoS0Djspn6PVFOxWP3A3XhQ0PbKABmw5dhpRlYZyY" };
} else {
  // This same file also runs in the background as the site's service worker, which shows booking
  // alerts on the phone even when the site is closed. (Cloudflare publishes a fixed list of files,
  // so it lives here instead of in its own file.)
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener("push", (e) => {
    let d = {}; try { d = e.data.json(); } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
    e.waitUntil(self.registration.showNotification(d.title || "B&B Lounge", { body: d.body || "", tag: d.tag, renotify: true, requireInteraction: true, icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" } }));
  });
  self.addEventListener("notificationclick", (e) => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || "./";
    e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }));
  });
}

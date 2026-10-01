/* Offline-Vorrat des Sende-Prüfers. Wer eine Datei aus CORE ändert, erhöht
   CACHE_VERSION — sonst liefert der Worker die alte Fassung weiter.
   Anfragen an fremde Adressen (die KI-Anbieter) fasst er NICHT an. */
const CACHE_VERSION = "sende-pruefer-v44";
const CORE = ["./", "index.html", "start.html", "assets/start.css?v=1", "sende-pruefer.html", "handbuch.html", "anleitung.html", "koeder.txt", "LIESMICH.md", "manifest.json", "icons/favicon-32.png", "icons/marke-72.png", "icons/sende-pruefer-bild.webp", "modules/25_pseudonym.js", "assets/abschirmung.js", "assets/sbkim-init.js", "assets/siegel-inhalt.js", "assets/schluesseltresor.js", "assets/tresor-ui.js", "assets/anbieter.js", "assets/ablehnung.js", "assets/aussen.js", "assets/anhaenge.js", "assets/installieren.js?v=1", "assets/pruefer-anhang.js", "assets/pruefer-formate.js", "assets/pruefer-mail.js", "assets/pruefer.js", "sicherheit.html", "impressum.html", "datenschutz.html"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) =>
    Promise.allSettled(CORE.map((u) => c.add(new Request(u, { cache: "reload" }))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const k = r.clone(); caches.open(CACHE_VERSION).then((c) => c.put(e.request, k)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("sende-pruefer.html"))));
});

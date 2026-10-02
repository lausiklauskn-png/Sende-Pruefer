/* Neu laden — der runde ⟳-Knopf in der Kopfleiste (Klaus 2026-10-02: „einen
   Aktualisierungsbutton ohne den Text … einfach nur den runden Drehbutton …
   für neue Version laden oder Hard Reload").
   Eigene Datei, nachgeladen von assets/sbkim-init.js: in der Seite ist kein
   Platz mehr (96-KB-Grenze). Fehlt sie, fehlt nur der Knopf.
   Ein Tipp wirft den Vorrat dieser App weg, meldet den Service-Worker ab und
   lädt mit GEÄNDERTER Adresse neu — nur eine andere Adresse ist für den
   HTTP-Cache eine andere Datei; location.reload() genügt nicht.
   Die Mails liegen in IndexedDB (SendePruefer1) und bleiben unberührt.
   Fail-soft: scheitert ein Schritt, wird trotzdem geladen. */
(function () {
  "use strict";
  var EIGEN = /^sende-pruefer-/;   /* nur die eigenen Vorräte — github.io teilen sich viele Apps */

  async function neuLaden(k) {
    if (k) { k.disabled = true; k.dataset.laedt = "1"; }
    try {
      if (window.caches && caches.keys) {
        var namen = await caches.keys();
        await Promise.all(namen.filter(function (n) { return EIGEN.test(n); }).map(function (n) { return caches.delete(n); }));
      }
    } catch (_e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        var regs = await navigator.serviceWorker.getRegistrations();
        var hier = new URL("./", location.href).href;
        await Promise.all(regs.filter(function (r) { return r.scope === hier; }).map(function (r) { return r.unregister(); }));
      }
    } catch (_e) {}
    location.replace(location.pathname + "?frisch=" + Date.now() + location.hash);
  }

  /* Das Anhängsel aus der Adresszeile nehmen, ohne neu zu laden. */
  function adresseAufraeumen() {
    try {
      if (/[?&]frisch=/.test(location.search) && history.replaceState) history.replaceState(null, "", location.pathname + location.hash);
    } catch (_e) {}
  }

  function einhaengen() {
    adresseAufraeumen();
    if (document.getElementById("neuladen")) return;
    var hilfe = document.getElementById("hilfe");
    if (!hilfe || !hilfe.parentNode) return;
    var k = document.createElement("button");
    k.type = "button"; k.className = "rund"; k.id = "neuladen";
    var t = "Neue Version laden (Vorrat leeren und neu laden)";
    k.setAttribute("aria-label", t); k.title = t;
    var z = document.createElement("span"); z.setAttribute("aria-hidden", "true"); z.textContent = "⟳";
    k.appendChild(z);
    k.addEventListener("click", function () { neuLaden(k); });
    /* immer direkt vor dem ? — gleich, welche Datei zuerst geladen ist */
    hilfe.parentNode.insertBefore(k, hilfe);
    var st = document.createElement("style");
    /* Platz in der Kopfleiste (gemessen 2026-10-02, Suchfeld muss >= 60 px behalten):
       die Beschriftungen der Knöpfe erst ab 1401 statt 1201 px (bei 1280 blieben
       dem Suchfeld sonst 42 px), und unter 360 px fehlt der Knopf (dort blieben
       26 px) — dann über Chrome ⋮ → neu laden. */
    st.textContent = "#neuladen{padding:0;font-size:1.2rem;font-weight:700}@media (max-width:1400px){.kopf .rund .t{display:none}}@media (max-width:359px){#neuladen{display:none}}#neuladen[data-laedt] span{display:inline-block;animation:neuladen-dreh .9s linear infinite}@keyframes neuladen-dreh{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){#neuladen[data-laedt] span{animation:none}}";
    document.head.appendChild(st);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", einhaengen);
  else einhaengen();
  window.SP_NEULADEN = { neuLaden: neuLaden };
})();

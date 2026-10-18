/* Sende-Prüfer — Knopf „Installieren" in der Kopfleiste (Klaus 2026-09-30).
 *
 * Anlass: am Tablet stand „App konnte nicht geöffnet werden", während die Seite
 * offen war. Die Meldung kommt NICHT von der Seite (sie trägt den Satz nirgends),
 * sondern von Android/Chrome. Der Knopf zeigt, was der Browser über die
 * Installation weiß:
 *   · läuft die Seite schon als installierte App  → kein Knopf, keine Meldung
 *                                                   (Klaus 2026-10-02: „Es ist nichts mehr zu tun“)
 *   · der Browser bietet die Installation an      → Tipp öffnet seinen Dialog
 *   · er bietet sie nicht an                      → Tipp nennt die Gründe und den
 *                                                   Weg über das Chrome-Menü
 * App-eigen, außerhalb der 96-KB-Grenze. Wird von sbkim-init.js nachgeladen;
 * fehlt die Datei, fehlt nur der Knopf. Texte nur über textContent. */
(function () {
  "use strict";
  var ereignis = null;

  function alsApp() {
    try {
      return (window.matchMedia && (matchMedia("(display-mode: standalone)").matches ||
        matchMedia("(display-mode: window-controls-overlay)").matches ||
        matchMedia("(display-mode: minimal-ui)").matches)) || navigator.standalone === true;
    } catch (_e) { return false; }
  }

  function melde(text) {
    var m = document.getElementById("install-meldung");
    if (!m) {
      m = document.createElement("div");
      m.id = "install-meldung";
      m.setAttribute("role", "status");
      m.style.cssText = "position:fixed;right:12px;top:64px;z-index:60;max-width:min(420px,calc(100vw - 24px));" +
        "background:var(--flaeche,#fff);color:inherit;border:1px solid var(--linie,#ccc);border-radius:12px;" +
        "padding:12px 14px;box-shadow:0 10px 30px rgb(0 0 0/.2);font-size:.9rem;line-height:1.4;white-space:pre-line";
      var zu = document.createElement("button");
      zu.type = "button"; zu.className = "knopf"; zu.textContent = "✕";
      zu.setAttribute("aria-label", "Meldung schließen");
      zu.style.cssText = "float:right;margin:-4px -4px 4px 8px";
      zu.addEventListener("click", function () { m.hidden = true; });
      m.appendChild(zu);
      var t = document.createElement("span"); t.id = "install-meldung-text"; m.appendChild(t);
    }
    /* Liegt ein Dialog offen (Menü), steht er in der obersten Ebene — eine Meldung in body
       läge dahinter und wäre unsichtbar. Darum dort hinein (Klaus 2026-10-18). */
    var d = document.querySelector("dialog[open]");
    if (m.parentNode !== (d || document.body)) (d || document.body).appendChild(m);
    lesbar(m);
    document.getElementById("install-meldung-text").textContent = text;
    m.hidden = false;
  }

  /* Lesbar machen (Klaus 2026-10-18, Handy: „helle Schrift auf hellem Hintergrund“).
     color:inherit erbt die Schrift der Seite, --flaeche fehlt in manchen Apps → weiß.
     Ist der Kontrast unter 4,5, steht die Meldung fest dunkel auf weiß. */
  function farbe(c) {
    var z = String(c).match(/[\d.]+/g); if (!z || z.length < 3) return null;
    var a = z.length > 3 ? +z[3] : 1; return a < 0.5 ? null : [+z[0], +z[1], +z[2]];
  }
  function hell(f) {
    var l = f.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  }
  function kontrast(a, b) { var x = hell(a), y = hell(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function lesbar(m) {
    try {
      var s = getComputedStyle(m), g = farbe(s.backgroundColor), t = farbe(s.color);
      if (!g || !t || kontrast(g, t) < 4.5) {
        m.style.background = "#fff"; m.style.color = "#1a1a1a"; m.style.borderColor = "#bbb";
        m.setAttribute("data-lesbar", "fest");
      } else m.setAttribute("data-lesbar", "seite");
    } catch (_e) { m.style.background = "#fff"; m.style.color = "#1a1a1a"; }
  }

  function knopfZeichnen() {
    var alle = document.querySelectorAll("[data-install-knopf]");
    for (var i = 0; i < alle.length; i++) zeichneEinen(alle[i]);
  }
  function zeichneEinen(k) {
    var app = alsApp();
    k.hidden = app; k.style.display = app ? "none" : "";   /* als App: weg, nicht „✓ App“ */
    k.dataset.lage = app ? "app" : (ereignis ? "angeboten" : "nicht-angeboten");
    k.querySelector("[data-z]").textContent = app ? "✓" : "⬇";
    k.querySelector(".t").textContent = app ? " App" : " Installieren";
    k.title = app ? "Läuft als installierte App" :
      (ereignis ? "Als App installieren" : "Installieren — der Browser bietet es gerade nicht an, ein Tipp sagt warum");
  }

  function klick() {
    if (alsApp()) return;   /* als App gibt es keinen Knopf (Klaus 2026-10-02) */
    if (ereignis) {
      var e = ereignis; ereignis = null;
      e.prompt();
      e.userChoice.then(function (w) {
        melde(w && w.outcome === "accepted"
          ? "Installiert. Die App liegt jetzt auf dem Startbildschirm bzw. in der App-Liste."
          : "Nicht installiert — abgebrochen.");
        knopfZeichnen();
      }).catch(function () { knopfZeichnen(); });
      return;
    }
    melde("Der Browser bietet die Installation gerade nicht an.\n\n" +
      "Häufigster Grund: Chrome hält ihn schon für installiert. Trägt das Symbol auf dem Startbildschirm " +
      "ein kleines Chrome-Zeichen, ist es nur eine VERKNÜPFUNG (öffnet in Chrome), keine App.\n\n" +
      "So wird es eine App: Symbol lange drücken → Entfernen bzw. Deinstallieren, diese Seite neu laden, " +
      "dann hier „Installieren“ tippen.\n\n" +
      "Sonst von Hand: Chrome ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.\n\n" +
      "„App konnte nicht geöffnet werden“ kommt vom Gerät, nicht von dieser Seite. Hilft nichts: " +
      "die App unter Android-Einstellungen → Apps deinstallieren, Chrome ganz schließen, diese Seite neu laden und noch einmal installieren. Bitte NICHT „Websitedaten löschen“: alle Apps unter dieser Adresse teilen sich einen Speicher, das löschte die Daten aller.");
  }

  function neuerKnopf(id, klasse) {
    var k = document.createElement("button");
    k.type = "button"; k.className = klasse; k.id = id; k.setAttribute("data-install-knopf", "");
    var z = document.createElement("span"); z.setAttribute("aria-hidden", "true"); z.setAttribute("data-z", "");
    var t = document.createElement("span"); t.className = "t";
    k.appendChild(z); k.appendChild(t);
    k.addEventListener("click", klick);
    return k;
  }

  /* Zweiter Knopf HINTEN im Menü (⚙), in der Zeile von „Hell oder dunkel“ (Klaus 2026-10-18:
     „Installieren-Button unter Einstellungen hinten, wie bei meinem Rezeptbuch“). Mechanik wie
     Sage-Protokol #1153 (data-ort, data-install-knopf). Am schmalen Handy ist der Knopf oben
     ausgeblendet — dort ist dieser der Weg. */
  function einstellungenEinhaengen() {
    var th = document.getElementById("thema-menue");
    var b = th && th.parentNode;
    if (!b || b.querySelector("[data-install-knopf]")) return;
    var k = neuerKnopf("installieren-einstellungen", th.className || "knopf");
    k.setAttribute("data-ort", "einstellungen");
    b.appendChild(k);
    zeichneEinen(k);
  }

  function einhaengen() {
    einstellungenEinhaengen();
    if (document.getElementById("installieren")) return;
    var st = document.createElement("style");
    var hilfe = document.getElementById("hilfe");
    var zurApp = document.querySelector("header.kopf [data-zur-app]");   /* start.html */
    if (hilfe && hilfe.parentNode) {
      var k = neuerKnopf("installieren", "rund");
      var vor = document.getElementById("neuladen") || hilfe;   /* ⟳ steht immer direkt vor dem ? */
      hilfe.parentNode.insertBefore(k, vor);
      /* Klaus 2026-10-18: „oben in die Navi-Leiste … man sieht nicht auf Anhieb, dass die App
         installiert werden kann.“ Bis dahin war der Knopf ≤ 480 px ausgeblendet (nur im ⚙-Menü).
         Jetzt steht er auf jeder Breite; Platz schaffen schmalere runde Knöpfe (Höhe bleibt 36 px)
         und kleinere Abstände — das Suchfeld behält bei 320 px über 60 px (gemessen 65). */
      st.textContent = "@media (max-width:480px){header.kopf{gap:4px}.kopf .rund{min-width:32px;padding:0 4px}}" +
        "@media (max-width:340px){header.kopf{gap:3px}}";
    } else if (zurApp) {
      var ks = neuerKnopf("installieren", "knopf leise");
      zurApp.parentNode.insertBefore(ks, zurApp);
      st.textContent = "@media (max-width:480px){#installieren .t{display:none}#installieren{padding:0 12px}}" +
        "@media (max-width:340px){#installieren{padding:0 8px}header.kopf [data-zur-app]{padding:0 10px}}";
    } else return;
    document.head.appendChild(st);
    knopfZeichnen();
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); ereignis = e; knopfZeichnen();
  });
  window.addEventListener("appinstalled", function () {
    ereignis = null; knopfZeichnen(); melde("Installiert.");
  });
  try { matchMedia("(display-mode: standalone)").addEventListener("change", knopfZeichnen); } catch (_e) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", einhaengen);
  else einhaengen();

  window.SP_INSTALL = { alsApp: alsApp, lage: function () { var k = document.getElementById("installieren") || document.querySelector("[data-install-knopf]"); return k ? k.dataset.lage : null; } };
})();

/* Postfach: auswählen, verschieben, Papierkorb, eigene Ordner — app-eigener
   Klebstoff (Klaus 2026-10-02).
   Klaus: „Ein längerer Druck auf eine Mail sollte die Möglichkeit geben, das
   manuell auszuwählen … Und dann entweder Ablage, eine neue Ablage erstellen,
   zum Beispiel Archiv oder Löschen … und neue Ordner hinzufügen auf der
   linken Seite."

   ART und ORT sind zwei Dinge. `m.ordner` bleibt, was die Seite schon kennt:
   die ART (eingang · entwurf · antwort · export) — an ihr hängt, ob eine Mail
   bearbeitbar ist und wer im Kopf steht. Der ORT steht neu in `m.ablage`:
   leer = der Ordner der Art, sonst „papierkorb" oder die Kennung eines eigenen
   Ordners (Archiv ist ein eigener Ordner, beim ersten Start angelegt). Damit
   ändert ein Verschieben nie, was eine Mail IST — und keine Mail muss beim
   Einbau umgeschrieben werden.

   Löschen legt in den Papierkorb (mit „Rückgängig"); erst dort wird
   endgültig gelöscht, und das fragt mit Zahl. Ein eigener Ordner, der
   gelöscht wird, gibt seine Mails an ihren Ursprungsordner zurück.

   Die Seite ist voll (96 KB). Diese Datei ersetzt deshalb zeichneOrdner(),
   zeichneListe() und loeschen() der Seite; sie wird von assets/ablehnung.js
   nachgeladen. Fehlt sie, läuft alles wie vorher. */
(function () {
  "use strict";
  var ABLAGEN_KEY = "sendepruefer_ablagen";
  var PK = "papierkorb";
  var LANGDRUCK = 450;
  var auswahl = false, sel = new Set(), geschluckt = { id: null, zeit: 0 };

  function ablagen() {
    try {
      var roh = localStorage.getItem(ABLAGEN_KEY);
      if (roh === null) { var start = [{ id: "archiv", name: "Archiv" }]; localStorage.setItem(ABLAGEN_KEY, JSON.stringify(start)); return start; }
      var l = JSON.parse(roh);
      return Array.isArray(l) ? l.filter(function (o) { return o && typeof o.id === "string" && typeof o.name === "string"; }) : [];
    } catch (_e) { return [{ id: "archiv", name: "Archiv" }]; }
  }
  function ablagenSchreiben(l) { try { localStorage.setItem(ABLAGEN_KEY, JSON.stringify(l)); } catch (_e) {} }
  function eigener(id) { return ablagen().find(function (o) { return o.id === id; }) || null; }
  /* Ein Ort, den es nicht (mehr) gibt, ist kein Ort: die Mail steht im Ordner ihrer Art. */
  function ortVon(m) {
    var a = m.ablage;
    if (a === PK) return PK;
    if (a && eigener(a)) return a;
    return m.ordner;
  }
  function anzahl(id) { return MAILS.filter(function (m) { return ortVon(m) === id; }).length; }
  function kopf(id) {
    if (id === PK) return { name: "Papierkorb", hin: "Gelöschte Mails — hier endgültig löschen oder zurückholen", icon: "🗑" };
    var e = eigener(id); if (e) return { name: e.name, hin: "Eigener Ordner", icon: id === "archiv" ? "🗄" : "📁" };
    var o = ORDNER.find(function (x) { return x.id === id; }) || ORDNER[0];
    return { name: o.name, hin: o.hin, icon: ICON[o.id] };
  }
  function ursprungName(m) { var o = ORDNER.find(function (x) { return x.id === m.ordner; }); return o ? o.name : m.ordner; }

  function geh(id) { st.ordner = id; st.id = null; auswahlEnde(); $("app").dataset.ansicht = "liste"; alles(); }

  function stil() {
    if (document.getElementById("postfach-stil")) return;
    var s = document.createElement("style"); s.id = "postfach-stil";
    s.textContent =
      ".zeile{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}" +
      ".zeile[data-gewaehlt]{background:var(--akzent-hell)}" +
      ".av.wahl{background:var(--fl2)!important;color:var(--akzent);border:2px solid var(--akzent)}" +
      ".zeile[data-gewaehlt] .av.wahl{background:var(--akzent)!important;color:#fff}" +
      ".ord-trenn{height:1px;background:var(--linie);margin:8px 10px}" +
      ".ord.neu-ordner{color:var(--leise)}" +
      ".wahlleiste{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;margin:0 0 8px;background:var(--fl);border:1px solid var(--akzent);border-radius:12px}" +
      ".wahlleiste .n{font-weight:700;margin-right:auto}" +
      ".wahlleiste .knopf{min-height:34px;padding:4px 10px}" +
      ".listenkopf{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 6px}" +
      ".listenkopf h2{margin:0 auto 0 0}" +
      ".listenkopf .knopf{min-height:32px;padding:3px 10px;font-weight:600;font-size:.82rem}" +
      ".pf-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:50;display:flex;gap:10px;align-items:center;background:var(--schrift);color:var(--fl);border-radius:12px;padding:10px 14px;box-shadow:0 8px 24px rgb(0 0 0/.25);max-width:calc(100vw - 24px)}" +
      ".pf-toast button{border:0;background:transparent;color:var(--glanz);font-weight:700;cursor:pointer}" +
      ".ziel-liste{display:flex;flex-direction:column;gap:4px;margin:8px 0}" +
      ".ziel-liste button{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--linie);background:var(--fl2);color:var(--schrift);border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit}" +
      ".ziel-liste button[aria-current=\"true\"]{border-color:var(--akzent);color:var(--akzent);font-weight:700}" +
      "@media (max-width:720px){.bottomnav{grid-template-columns:repeat(5,minmax(0,1fr))!important}}";
    document.head.append(s);
  }

  /* ── Ordner links (und unten am Handy) ── */
  function ordKnopf(id, icon, name, zahl, extra) {
    var a = { class: "ord", type: "button", "data-ordner": id, "aria-current": String(st.ordner === id), title: kopf(id).hin, onclick: function () { geh(id); } };
    for (var k in extra || {}) a[k] = extra[k];
    return el("button", a, el("span", { "aria-hidden": "true" }, icon), el("span", { class: "t" }, name), el("span", { class: "zahl" }, String(zahl)));
  }
  function zeichneOrdner() {
    var box = $("ordnerliste"), bn = $("bottomnav");
    box.replaceChildren(); bn.replaceChildren();
    ORDNER.forEach(function (o) {
      box.append(ordKnopf(o.id, ICON[o.id], o.name, anzahl(o.id)));
      bn.append(el("button", { type: "button", "data-ordner": o.id, "aria-current": String(st.ordner === o.id), onclick: function () { geh(o.id); } },
        el("span", { "aria-hidden": "true" }, ICON[o.id]), o.name));
    });
    box.append(el("div", { class: "ord-trenn", "aria-hidden": "true" }));
    ablagen().forEach(function (o) { box.append(ordKnopf(o.id, kopf(o.id).icon, o.name, anzahl(o.id), { "data-eigen": "" })); });
    box.append(ordKnopf(PK, "🗑", "Papierkorb", anzahl(PK)));
    box.append(el("button", { class: "ord neu-ordner", type: "button", id: "ordner-neu", title: "Einen eigenen Ordner anlegen, z. B. Archiv", onclick: function () { neuerOrdner(); } },
      el("span", { "aria-hidden": "true" }, "＋"), el("span", { class: "t" }, "Neuer Ordner")));
    var mehrAn = st.ordner === PK || !!eigener(st.ordner);
    bn.append(el("button", { type: "button", id: "ordner-mehr", "data-ordner": "mehr", "aria-current": String(mehrAn), onclick: mehrDialog },
      el("span", { "aria-hidden": "true" }, "📁"), mehrAn ? kopf(st.ordner).name : "Mehr"));
  }
  function mehrDialog() {
    var liste = [];
    ablagen().forEach(function (o) { liste.push([o.id, kopf(o.id).icon + " " + o.name + " (" + anzahl(o.id) + ")"]); });
    liste.push([PK, "🗑 Papierkorb (" + anzahl(PK) + ")"]);
    zielDialog("Weitere Ordner", "", liste, function (id) { if (id === "+") neuerOrdner(); else geh(id); }, true);
  }

  /* ── Ein Dialog für alle Ziel-Fragen ── */
  function zielDialog(titel, text, ziele, wahl, mitNeu) {
    var d = el("dialog", { id: "ziel-dialog", "aria-label": titel }, el("h2", null, titel), text ? el("p", { class: "gedaempft" }, text) : null);
    var l = el("div", { class: "ziel-liste" });
    ziele.forEach(function (z) {
      l.append(el("button", { type: "button", "data-ziel": z[0], "aria-current": String(st.ordner === z[0]), onclick: function () { d.close(); wahl(z[0]); } }, z[1]));
    });
    if (mitNeu) l.append(el("button", { type: "button", "data-ziel": "+", onclick: function () { d.close(); wahl("+"); } }, "＋ Neuer Ordner …"));
    d.append(l, el("div", { class: "fuss" }, el("button", { class: "knopf", type: "button", onclick: function () { d.close(); } }, "Abbrechen")));
    d.addEventListener("close", function () { d.remove(); });
    var alt = document.getElementById("ziel-dialog"); if (alt) alt.remove();
    document.body.append(d); d.showModal();
    return d;
  }

  function neuerOrdner(danach) {
    var name = prompt("Name des neuen Ordners (z. B. Archiv, Kunden, Erledigt):", "");
    name = String(name || "").trim().slice(0, 40);
    if (!name) return null;
    var l = ablagen();
    var gleich = l.find(function (o) { return o.name.toLowerCase() === name.toLowerCase(); });
    if (gleich) { toast("Den Ordner „" + gleich.name + "“ gibt es schon."); if (danach) danach(gleich.id); return gleich.id; }
    var id = "f_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    l.push({ id: id, name: name }); ablagenSchreiben(l);
    if (danach) danach(id); else geh(id);
    return id;
  }
  function umbenennen(id) {
    var l = ablagen(), o = l.find(function (x) { return x.id === id; }); if (!o) return;
    var name = String(prompt("Neuer Name für „" + o.name + "“:", o.name) || "").trim().slice(0, 40);
    if (!name || name === o.name) return;
    if (l.some(function (x) { return x.id !== id && x.name.toLowerCase() === name.toLowerCase(); })) { toast("Den Ordner „" + name + "“ gibt es schon."); return; }
    o.name = name; ablagenSchreiben(l); alles();
  }
  function ordnerLoeschen(id) {
    var o = eigener(id); if (!o) return;
    var drin = MAILS.filter(function (m) { return m.ablage === id; });
    if (!confirm("Ordner „" + o.name + "“ löschen?" + (drin.length ? "\n\nDie " + drin.length + " Mail(s) darin gehen zurück in ihren Ursprungsordner — keine wird gelöscht." : ""))) return;
    drin.forEach(function (m) { delete m.ablage; jetztSpeichern(m); });
    ablagenSchreiben(ablagen().filter(function (x) { return x.id !== id; }));
    geh(drin.length ? drin[0].ordner : "eingang");
  }

  /* ── Verschieben, Papierkorb, zurückholen, endgültig ── */
  function verschiebe(ms, ziel) {
    ms.forEach(function (m) {
      if (ziel === PK) { if (m.ablage !== PK) { m.geloeschtAus = m.ablage || ""; m.ablage = PK; } }
      else if (ziel === "") { delete m.ablage; delete m.geloeschtAus; }
      else { m.ablage = ziel; delete m.geloeschtAus; }
      jetztSpeichern(m);   // der Ort steht an der Mail und reist mit ihr
    });
    if (st.id && ms.some(function (m) { return m.id === st.id; })) { st.id = null; $("app").dataset.ansicht = "liste"; }
    auswahlEnde(); alles();
  }
  function zurueckholen(ms) {
    ms.forEach(function (m) { var a = m.geloeschtAus; delete m.geloeschtAus; if (a && eigener(a)) m.ablage = a; else delete m.ablage; jetztSpeichern(m); });
    auswahlEnde(); alles();
    toast(ms.length + " Mail(s) zurückgeholt.");
  }
  function endgueltig(ms, ohneFrage) {
    if (!ms.length) return;
    if (!ohneFrage && !confirm(ms.length + " Mail(s) endgültig löschen?\n\nDas lässt sich nicht rückgängig machen.")) return;
    var ids = new Set(ms.map(function (m) { return m.id; }));
    MAILS = MAILS.filter(function (x) { return !ids.has(x.id); });
    ids.forEach(function (id) { dbTx("readwrite", function (s) { return s.delete(id); }); });
    if (ids.has(st.id)) { st.id = null; $("app").dataset.ansicht = "liste"; }
    auswahlEnde(); alles();
  }
  function inPapierkorb(ms) {
    if (!ms.length) return;
    verschiebe(ms, PK);
    toast(ms.length === 1 ? "In den Papierkorb gelegt." : ms.length + " Mails in den Papierkorb gelegt.", "Rückgängig", function () { zurueckholen(ms); });
  }
  function verschiebenDialog(ms) {
    if (!ms.length) return;
    var ziele = [];
    ablagen().forEach(function (o) { ziele.push([o.id, kopf(o.id).icon + " " + o.name]); });
    if (ms.some(function (m) { return m.ablage; })) ziele.unshift(["", "↩ Zurück in den Ursprungsordner (" + Array.from(new Set(ms.map(ursprungName))).join(", ") + ")"]);
    zielDialog(ms.length + " Mail(s) verschieben", "Wohin?", ziele, function (id) {
      if (id === "+") { neuerOrdner(function (neu) { verschiebe(ms, neu); toast(ms.length + " Mail(s) verschoben nach „" + kopf(neu).name + "“."); }); return; }
      verschiebe(ms, id);
      toast(ms.length + " Mail(s) verschoben" + (id ? " nach „" + kopf(id).name + "“." : " in ihren Ursprungsordner."));
    }, true);
  }

  /* ── Rückmeldung unten, mit „Rückgängig" ── */
  var toastUhr = 0;
  function toast(t, knopf, tun) {
    var alt = document.getElementById("pf-toast"); if (alt) alt.remove(); clearTimeout(toastUhr);
    var e = el("div", { class: "pf-toast", id: "pf-toast", role: "status" }, el("span", null, t),
      knopf ? el("button", { type: "button", id: "pf-toast-knopf", onclick: function () { e.remove(); tun(); } }, knopf) : null);
    document.body.append(e);
    toastUhr = setTimeout(function () { e.remove(); }, 7000);
  }

  /* ── Auswahl ── */
  function auswahlEnde() { auswahl = false; sel.clear(); }
  function sichtbare() {
    var q = $("suche").value.trim().toLowerCase();
    return MAILS.filter(function (m) { return ortVon(m) === st.ordner && (!q || ganzeMail(m).toLowerCase().includes(q)); })
      .sort(function (a, b) { return String(b.zeit).localeCompare(String(a.zeit)); });
  }
  function gewaehlte() { return MAILS.filter(function (m) { return sel.has(m.id); }); }
  function umschalten(id) { if (sel.has(id)) sel.delete(id); else sel.add(id); if (!sel.size) auswahl = false; zeichneOrdner(); zeichneListe(); }

  function langDruck(zeile, id) {
    var uhr = 0, x = 0, y = 0;
    function weg() { clearTimeout(uhr); uhr = 0; }
    zeile.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      x = e.clientX; y = e.clientY; weg(); geschluckt = { id: null, zeit: 0 };   // ein neuer Druck beginnt
      uhr = setTimeout(function () {
        uhr = 0; geschluckt = { id: id, zeit: Date.now() };
        if (!auswahl) { auswahl = true; sel.clear(); }
        sel.add(id);
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (_e) {}
        zeichneOrdner(); zeichneListe();
      }, LANGDRUCK);
    });
    zeile.addEventListener("pointermove", function (e) { if (uhr && Math.hypot(e.clientX - x, e.clientY - y) > 10) weg(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) { zeile.addEventListener(t, weg); });
    zeile.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function zeichneListe() {
    var k = kopf(st.ordner), box = $("liste");
    var mails = sichtbare(), q = $("suche").value.trim();
    var kopfzeile = el("div", { class: "listenkopf" }, el("h2", null, k.name));
    if (!auswahl && mails.length) kopfzeile.append(el("button", { class: "knopf", type: "button", id: "auswahl-start", title: "Mehrere Mails auswählen (oder lange auf eine Mail drücken)", onclick: function () { auswahl = true; sel.clear(); zeichneListe(); } }, "☑ Auswählen"));
    if (eigener(st.ordner)) {
      kopfzeile.append(el("button", { class: "knopf", type: "button", id: "ordner-umbenennen", onclick: function () { umbenennen(st.ordner); } }, "✎ Umbenennen"),
        el("button", { class: "knopf", type: "button", id: "ordner-loeschen", onclick: function () { ordnerLoeschen(st.ordner); } }, "Ordner löschen"));
    }
    if (st.ordner === PK && mails.length) kopfzeile.append(el("button", { class: "knopf", type: "button", id: "papierkorb-leeren", onclick: function () { endgueltig(MAILS.filter(function (m) { return ortVon(m) === PK; })); } }, "Papierkorb leeren"));
    box.replaceChildren(kopfzeile, el("p", { class: "unter" }, k.hin));
    if (auswahl) box.append(wahlleiste(mails));
    if (!mails.length) box.append(el("p", { class: "unter" }, q ? "Keine Mail passt zur Suche." : st.ordner === PK ? "Der Papierkorb ist leer." : "Keine E-Mails in diesem Ordner."));
    mails.forEach(function (m) {
      var gew = sel.has(m.id);
      var z = el("button", { class: "zeile" + (m.ungelesen ? " ungelesen" : ""), type: "button", "data-id": m.id, "aria-current": String(!auswahl && st.id === m.id),
        "data-gewaehlt": auswahl && gew ? "" : null, "aria-pressed": auswahl ? String(gew) : null,
        onclick: function () {
          var schluck = geschluckt.id === m.id && Date.now() - geschluckt.zeit < 1500; geschluckt = { id: null, zeit: 0 };
          if (schluck) return;   // genau der EINE Klick, der den langen Druck beendet
          if (auswahl) umschalten(m.id); else oeffne(m.id);
        } },
        auswahl ? el("span", { class: "av wahl", "aria-hidden": "true" }, gew ? "✓" : "") : avatar(wer(m).replace(/^An: /, ""), m.id),
        el("span", { class: "wer" }, wer(m)), el("span", { class: "zeit" }, zeitText(m.zeit)),
        el("span", { class: "betr" }, m.betreff || "(ohne Betreff)"),
        el("span", { class: "chips" }, schutzChip(pruefung(m).treffer.length),
          m.beispiel ? el("span", { class: "chip leise" }, "Beispiel · erfunden") : null,
          m.ablage && st.ordner !== m.ordner ? el("span", { class: "chip leise", "data-ursprung": m.ordner }, kopf(m.ordner).icon + " " + ursprungName(m)) : null));
      langDruck(z, m.id);
      box.append(z);
    });
  }
  function wahlleiste(mails) {
    var n = sel.size, alleDa = mails.length && mails.every(function (m) { return sel.has(m.id); });
    var leiste = el("div", { class: "wahlleiste", id: "wahlleiste", role: "toolbar", "aria-label": "Auswahl" },
      el("span", { class: "n", "data-anzahl": n }, n + " gewählt"),
      el("button", { class: "knopf", type: "button", id: "wahl-alle", onclick: function () {
        if (alleDa) sel.clear(); else mails.forEach(function (m) { sel.add(m.id); });
        zeichneListe(); } }, alleDa ? "Keine" : "Alle"));
    if (st.ordner === PK) {
      leiste.append(el("button", { class: "knopf", type: "button", id: "wahl-zurueck", disabled: !n, onclick: function () { zurueckholen(gewaehlte()); } }, "↩ Zurückholen"),
        el("button", { class: "knopf", type: "button", id: "wahl-endgueltig", disabled: !n, onclick: function () { endgueltig(gewaehlte()); } }, "🗑 Endgültig löschen"));
    } else {
      leiste.append(el("button", { class: "knopf", type: "button", id: "wahl-verschieben", disabled: !n, onclick: function () { verschiebenDialog(gewaehlte()); } }, "📁 Verschieben"),
        el("button", { class: "knopf", type: "button", id: "wahl-loeschen", disabled: !n, onclick: function () { inPapierkorb(gewaehlte()); } }, "🗑 Löschen"));
    }
    leiste.append(el("button", { class: "knopf", type: "button", id: "wahl-ende", "aria-label": "Auswahl beenden", onclick: function () { auswahlEnde(); zeichneOrdner(); zeichneListe(); } }, "✕"));
    return leiste;
  }

  /* 🗑 in der geöffneten Mail: erst Papierkorb, dort endgültig (mit Frage). */
  function loeschen(m) {
    if (ortVon(m) === PK) { if (confirm("Diese Mail endgültig löschen?\n\n" + (m.betreff || "(ohne Betreff)"))) endgueltig([m], true); return; }
    inPapierkorb([m]);
  }

  function einbauen() {
    if (typeof ORDNER === "undefined" || typeof window.zeichneListe !== "function") return;
    stil();
    window.zeichneOrdner = zeichneOrdner;
    window.zeichneListe = zeichneListe;
    window.loeschen = loeschen;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && auswahl && !document.querySelector("dialog[open]")) { auswahlEnde(); zeichneOrdner(); zeichneListe(); } });
    window.SPPostfach = { eingebaut: true, ortVon: ortVon, ablagen: ablagen, verschiebe: verschiebe, PAPIERKORB: PK, LANGDRUCK: LANGDRUCK };
    if (window.SendePruefer && window.SendePruefer.bereit) alles();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", einbauen); else einbauen();
})();

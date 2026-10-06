/* Prioritätenliste im Sende-Prüfer — app-eigener Klebstoff (Klaus 2026-10-05).
   Der Kern ist assets/prioritaeten.js, byte-1:1 aus Mein-In-and-Out-Book
   (SHA-gepinnt in tests/prio.mjs) — dort pflegen, hier neu kopieren.
   Eigener Schlüssel: sendepruefer_prioritaeten_v1 (github.io ist eine geteilte
   Adresse; der Schlüssel des In-and-Out-Books bleibt unberührt).
   · Menü: Kasten „Was Ihnen wichtig ist“ vor der Abschirmung.
   · Jede geöffnete Mail: Kasten [data-prio-treffer] unter den Funden. Eine
     eingefügte Mail zählt als Eingang, alles andere als Ausgang. Anhänge (Name
     und gelesener Text) zählen mit.
   · Ausgang: ein Treffer der Stufe „streng“ hält Kopieren, Senden, .eml und
     Teilen einmal an; ein zweiter Tipp geht weiter. „normal“ steht nur da.
   · Befunde des Prüfkerns tragen die Stufe ihrer Gruppe (data-prio-stufe).
   Nie „harmlos“: jeder Treffer sagt, wie er gefunden wurde, und gibt eine
   Empfehlung. Nur textContent, kein innerHTML. Die Seite ist voll (96 KB),
   deshalb lädt assets/ablehnung.js diese Datei nach. */
(function () {
  "use strict";
  var SCHLUESSEL = "sendepruefer_prioritaeten_v1";
  var textCache = {};                        // Anhang-id → gelesener Text ("" = gelesen, nichts)
  var bestaetigt = {};
  function P() { return window.Prioritaeten || null; }
  function stand() { var p = P(); return p ? p.laden(SCHLUESSEL) : null; }
  function el(t, a, kinder) {
    var e = document.createElement(t);
    if (a) Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); });
    [].concat(kinder || []).forEach(function (k) { if (k != null) e.append(k); });
    return e;
  }
  function richtungVon(m) { return m && m.ordner === "eingang" ? "eingang" : "ausgang"; }
  function texteVon(m, mitAnhang) {
    var t = [{ text: m.betreff || "", stelle: "Betreff" }, { text: m.text || "", stelle: "Mailtext" }];
    if (m.bitte) t.push({ text: m.bitte, stelle: "Aufgabe an die KI" });
    var offen = [];
    if (mitAnhang) (m.anhaenge || []).forEach(function (a) {
      t.push({ text: a.name || "", stelle: "Anhang „" + a.name + "“ (Dateiname)" });
      if (Object.prototype.hasOwnProperty.call(textCache, a.id)) t.push({ text: textCache[a.id], stelle: "Anhang „" + a.name + "“" });
      else offen.push(a);
    });
    return { texte: t, offen: offen };
  }
  function trefferVon(m, mitAnhang) {
    var p = P(); if (!p) return null;
    var x = texteVon(m, mitAnhang);
    return { liste: p.treffer(x.texte, stand(), richtungVon(m)), offen: x.offen };
  }
  /* Den Text der Anhänge besorgen (dieselbe Prüfung wie im 📎-Abschnitt, kein zweiter Lauf). */
  function anhangLesen(m, fertig) {
    var UI = window.SPAnhangUI, L = (m.anhaenge || []).filter(function (a) { return !Object.prototype.hasOwnProperty.call(textCache, a.id); });
    if (!L.length || !UI || !UI.ergebnis) return;
    Promise.all(L.map(function (a) {
      return UI.ergebnis(a).then(function (r) { textCache[a.id] = String(r && r.text || ""); }, function () { textCache[a.id] = ""; });
    })).then(fertig);
  }

  /* ── Kasten in der Mail ── */
  function kasten(m) {
    var alt = document.querySelector("[data-prio-treffer]"); if (alt) alt.remove();
    var vor = document.getElementById("funde"); if (!vor) return;
    var r = trefferVon(m, true), k;
    if (!r) {
      k = el("div", { class: "kasten", "data-prio-treffer": "ungeprueft" },
        el("p", null, "Prioritätenliste: nicht geladen (assets/prioritaeten.js) — die Mail ist darauf UNGEPRÜFT."));
    } else {
      var L = r.liste, streng = L.filter(function (t) { return t.stufe === "streng"; }).length;
      k = el("div", { class: "kasten", "data-prio-treffer": String(L.length), "data-prio-streng": String(streng), "data-richtung": richtungVon(m) },
        el("h3", { style: "margin:0 0 4px;font-size:1rem" }, "⭐ Aus Ihrer Prioritätenliste: " + L.length + " Treffer" + (streng ? " (davon " + streng + " streng)" : "")));
      if (!L.length) k.append(el("p", { class: "gedaempft", style: "margin:0" }, "Kein Wort aus Ihrer Liste gefunden. Gesucht wird nach festen Wörtern — das heißt nicht, dass nichts Wichtiges darin steht."));
      else {
        var ul = el("ul", { class: "befunde" });
        L.forEach(function (t) {
          /* Jedes Stück ein eigenes Element mit Marke: so übersetzt die Sprachschicht es einzeln,
             und das gefundene Wort (Inhalt) bleibt, wie es ist. */
          ul.append(el("li", { "data-prio-gruppe": t.gruppe, "data-prio-stufe": t.stufe },
            [el("b", { "data-prio-wort": "", "data-kein-ue": "" }, t.wort), " — ",
             el("b", { "data-prio-gn": "" }, t.gruppeName), " (", el("b", { "data-prio-st": "" }, t.stufe), "), ",
             el("span", { "data-prio-stelle": "" }, t.stelle), ". ",
             el("span", { "data-prio-satz": "" }, t.satz), " ",
             el("span", { "data-prio-empf": "" }, "Empfehlung: " + t.empfehlung)]));
        });
        k.append(ul);
      }
      if (r.offen.length) k.append(el("p", { class: "gedaempft", "data-prio-offen": String(r.offen.length) }, r.offen.length + " Anhang/Anhänge wird/werden noch gelesen — der Kasten ergänzt sich danach."));
      if (richtungVon(m) === "ausgang" && streng) k.append(el("p", { class: "meldung warn", style: "margin:4px 0 0" }, "Vor Kopieren, Senden, .eml und Teilen hält die Seite einmal an. Ein zweiter Tipp geht weiter."));
      k.append(el("p", { class: "gedaempft", style: "margin:4px 0 0" }, "Einstellen: ⚙ Menü → „Was Ihnen wichtig ist“."));
    }
    vor.after(k);
    if (r && r.offen.length) anhangLesen(m, function () { var a = typeof aktuell === "function" ? aktuell() : null; if (a && a.id === m.id) kasten(a); });
    stufenMarken();
  }
  /* Befunde des Prüfkerns (data-sorte) tragen die Stufe ihrer Gruppe. Der Befund selbst bleibt. */
  function stufenMarken() {
    var p = P(); if (!p) return;
    var s = stand();
    document.querySelectorAll("#befunde li[data-sorte]").forEach(function (li) {
      if (li.hasAttribute("data-prio-stufe")) return;
      var x = p.stufeFuer(li.getAttribute("data-sorte"), s); if (!x) return;
      li.setAttribute("data-prio-stufe", x.stufe);
      li.append(el("span", { class: "gedaempft", "data-prio-marke": "" }, " · Prioritätenliste: " + x.gruppeName + " (" + x.stufe + ")"));
    });
  }

  /* ── Halt beim Hinausgehen ── */
  function schluessel(m, wo) { return wo + "\u0000" + m.id + "\u0000" + (m.betreff || "") + "\u0000" + (m.text || "") + "\u0000" + (m.bitte || "") + "\u0000" + (m.anhaenge || []).map(function (a) { return a.id; }).join(","); }
  /* Gibt einen Satz zurück, wenn angehalten wird, sonst null. */
  function halt(m, wo, mitAnhang) {
    var k = schluessel(m, wo);
    if (bestaetigt[k]) return null;
    var r = trefferVon(m, mitAnhang);
    if (!r) { bestaetigt[k] = true; return "Die Prioritätenliste (assets/prioritaeten.js) ist nicht geladen — die Mail ist darauf UNGEPRÜFT. Noch einmal tippen, um ohne diese Prüfung weiterzugehen."; }
    var streng = r.liste.filter(function (t) { return t.stufe === "streng"; });
    if (streng.length) {
      bestaetigt[k] = true;
      var t = streng[0];
      return "Angehalten — " + streng.length + " Treffer der Stufe „streng“ aus Ihrer Prioritätenliste, zuerst „" + t.wort + "“ (" + t.gruppeName + "), " + t.stelle +
        ". Gefunden über eine feste Wortliste. Empfehlung: " + t.empfehlung + " Noch einmal tippen, um trotzdem weiterzugehen.";
    }
    if (r.offen.length) {
      bestaetigt[k] = true;
      anhangLesen(m, function () {});
      return "Angehalten — " + r.offen.length + " Anhang/Anhänge wird/werden noch auf Ihre Prioritätenliste gelesen. Einen Moment warten und noch einmal tippen; ein Tipp sofort geht ohne diese Prüfung weiter.";
    }
    return null;
  }
  function meldeAktion(t) {
    var e = document.getElementById("aktion-meldung");
    if (e) { e.className = "meldung warn"; e.textContent = t; e.setAttribute("data-prio-halt", ""); }
  }

  function einbauen() {
    if (window.SPPrio) return;
    var altBereit = window.bereit, altEml = window.emlSpeichern, altTeilen = window.teilen, altLesen = window.zeichneLesen;
    if (typeof altBereit === "function") window.bereit = function (m, meldung) {
      var r = altBereit(m, meldung); if (!r) return r;
      var h = halt(m, "ki", false); if (h) { meldung(h); return null; }
      return r;
    };
    if (typeof altEml === "function") window.emlSpeichern = function (m) {
      var h = halt(m, "aus", true); if (h) { meldeAktion(h); return; }
      return altEml.apply(this, arguments);
    };
    if (typeof altTeilen === "function") window.teilen = function (m) {
      var h = halt(m, "aus", true); if (h) { meldeAktion(h); return; }
      return altTeilen.apply(this, arguments);
    };
    if (typeof altLesen === "function") window.zeichneLesen = function () {
      var r = altLesen.apply(this, arguments), m = typeof aktuell === "function" ? aktuell() : null;
      if (m) kasten(m);
      return r;
    };
    menue();
    window.SPPrio = { SCHLUESSEL: SCHLUESSEL, treffer: trefferVon, halt: halt, kasten: kasten, eingebaut: true };
    var m = typeof aktuell === "function" ? aktuell() : null;
    if (m && document.getElementById("funde")) kasten(m);
  }
  function menue() {
    var vor = document.getElementById("abschirm-kasten");
    if (!vor || document.getElementById("prio-kasten")) return;
    var box = el("div", { id: "prio-einst" });
    var k = el("div", { class: "kasten", id: "prio-kasten" }, [
      el("h2", null, "⭐ Was Ihnen wichtig ist"),
      el("p", null, "Ihre Prioritätenliste: Wörter, bei denen die Seite genauer hinsieht — in eingefügten Mails und in allem, was hinausgeht, samt Anhängen. Bei „streng“ hält sie vor dem Hinausgehen einmal an. Sie gilt nur in diesem Browser und nur im Sende-Prüfer."),
      box]);
    vor.before(k);
    var p = P();
    if (p) p.baueEinstellungen(box, SCHLUESSEL, function () {
      var m = typeof aktuell === "function" ? aktuell() : null; bestaetigt = {};
      if (m && document.getElementById("funde")) kasten(m);
    });
    else box.append(el("p", { class: "meldung warn", "data-prio-fehlt": "" }, "Die Prioritätenliste (assets/prioritaeten.js) ist nicht geladen."));
  }
  if (document.readyState === "complete") einbauen();
  else window.addEventListener("load", einbauen);
})();

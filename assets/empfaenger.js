/* Alle Empfänger und Cc als Namen verdecken — app-eigener Klebstoff
   (Klaus 2026-10-02, Punkt 4 der Grenzen-Liste).

   mailLesen() der Seite behält nur den ERSTEN Eintrag aus „An“; weitere
   Empfänger und Cc fielen weg. Ihre Namen wurden damit nicht verdeckt, wenn
   sie im Text standen („Hallo Frau Beispiel, …“ an die Zweite im Verteiler).
   Diese Datei liest beim Einfügen An und Cc ganz und legt die übrigen Namen
   in `m.weitereNamen` ab; mailNamen() nimmt sie mit.

   Die Kopfzeilen selbst gehen weiter NICHT an die KI (ganzeMail nennt nur Von
   und den ersten Empfänger) — verdeckt werden die Namen, wo sie im Text stehen.
   Adressen sind ohnehin Sorte MAIL.

   Die Seite ist voll (96 KB). Diese Datei ersetzt mailLesen(), mailNamen()
   und aktualisiere() der Seite; sie wird von assets/ablehnung.js
   nachgeladen. Fehlt sie, läuft alles wie vorher. */
(function () {
  "use strict";
  if (typeof mailLesen !== "function" || typeof mailNamen !== "function") return;
  var altLesen = mailLesen, altNamen = mailNamen, altAkt = typeof aktualisiere === "function" ? aktualisiere : null;

  /* Teilt „A <a>, "B, C" <b>; d@x“ an Komma und Semikolon außerhalb von Anführungszeichen. */
  function teile(s) {
    var out = [], cur = "", q = false;
    String(s || "").split("").forEach(function (c) {
      if (c === '"') q = !q;
      if (!q && (c === "," || c === ";")) { out.push(cur); cur = ""; } else cur += c;
    });
    out.push(cur);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function namenAus(liste) {
    return liste.map(function (x) { return zerlegeAdresse(x).name.trim(); }).filter(function (n) { return n.length >= 2; });
  }
  /* Alle Namen aus An und Cc, im Rohtext gelesen — beide Wege von mailLesen. */
  function empfaengerNamen(roh) {
    roh = String(roh || "").replace(/^﻿/, "");
    var erste = roh.split(/\r?\n/, 1)[0], n = [];
    if (/^(from|to|subject|date|received|return-path|message-id|mime-version|delivered-to|x-[\w-]+):/i.test(erste)) {
      var k = kopfTeilen(roh).k;
      ["to", "cc"].forEach(function (f) { if (k[f]) n = n.concat(namenAus(teile(kopfWort(k[f])))); });
      return n;
    }
    var zeilen = roh.replace(/\r\n/g, "\n").split("\n");
    for (var i = 0; i < zeilen.length; i++) {
      var z = zeilen[i].match(/^(Von|An|Betreff|Datum|Gesendet|Cc):\s*(.*)$/i);
      if (!z) break;
      var w = z[1].toLowerCase();
      if (w === "an" || w === "cc") n = n.concat(namenAus(teile(z[2])));
    }
    return n;
  }

  window.mailLesen = function (roh) {
    var m = altLesen(roh);
    var schon = [m.vonName, m.anName].map(function (x) { return String(x || "").trim(); });
    var weitere = [];
    empfaengerNamen(roh).forEach(function (x) { if (schon.indexOf(x) < 0 && weitere.indexOf(x) < 0) weitere.push(x); });
    /* Ein deutscher „An:“-Eintrag mit mehreren Namen landete ganz in anName — dann gilt nur der erste. */
    if (m.anName && teile(m.anName).length > 1) {
      var ersterAn = zerlegeAdresse(teile(m.anName)[0]);
      m.anName = ersterAn.name; if (!m.anAdr) m.anAdr = ersterAn.adr;
      weitere = weitere.filter(function (x) { return x !== m.anName && x !== String(m.vonName || "").trim(); });
    }
    if (weitere.length) m.weitereNamen = weitere;
    return m;
  };

  window.mailNamen = function (m) {
    var w = Array.isArray(m && m.weitereNamen) ? m.weitereNamen : [];
    var alle = altNamen(m).concat(w.map(function (n) { return String(n || "").trim(); }).filter(function (n) { return n.length >= 2; }));
    return alle.filter(function (n, i) { return alle.indexOf(n) === i; });
  };

  if (altAkt) window.aktualisiere = function (m) {
    altAkt(m);
    var e = document.getElementById("namen-auto");
    var w = Array.isArray(m && m.weitereNamen) ? m.weitereNamen : [];
    if (!e || !w.length) return;
    var auto = [m.vonName, m.anName].filter(function (n) { return String(n || "").trim().length >= 2; }).concat(w);
    e.textContent = "Aus Von/An/Cc: " + auto.join(", ");
    e.dataset.cc = String(w.length);
  };

  window.SPEmpfaenger = { eingebaut: true, empfaengerNamen: empfaengerNamen, teile: teile };
})();

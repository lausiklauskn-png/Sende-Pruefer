/*
 * sicherung.js — DAS POSTFACH SICHERN UND ZURÜCKHOLEN (Klaus 2026-10-02).
 *
 * Klaus: „wer den Browser löscht, löscht auch das Postfach. Da gibt es eine
 * Möglichkeit, das Postfach mit einem Tresor … zu sichern" · „Sicherungsdatei
 * mit einem eigenen Passwort verschlüsselt? Ich empfehle ja."
 *
 * Die Mails liegen nur in der IndexedDB dieses Browsers. Wer Browserdaten
 * löscht, das Gerät wechselt oder den Speicher voll laufen lässt, verliert sie.
 * Diese Datei legt eine SICHERUNGSDATEI an — alle Mails samt Anhängen, eigenen
 * Ordnern und eigenen Aufgaben — verschlüsselt mit einem EIGENEN Passwort
 * (AES-256-GCM, PBKDF2-SHA256 600 000 Runden, das Schloss aus
 * assets/schluesseltresor.js, byte-1:1 aus kim-hub-company).
 *
 * ⚠ DREI DINGE, AUF DIE ES ANKOMMT:
 * 1. Die Datei verlässt das Gerät (Download-Ordner, Cloud, Mail). Deshalb steht
 *    in ihr KEIN Klartext — nur Art, Fassung, Datum und das Paket. Wie viele
 *    Mails darin sind, erfährt erst, wer das Passwort hat.
 * 2. Das Passwort wird nirgends gespeichert. Ist es weg, ist die Sicherung
 *    nicht mehr zu öffnen — das steht neben dem Feld, nicht nur hier.
 * 3. Zurückholen FÜGT HINZU und überschreibt nichts: eine Mail, deren Kennung
 *    schon da ist, bleibt wie sie ist. Die Meldung nennt beide Zahlen.
 *
 * Die KI-Schlüssel kommen NICHT mit — sie haben ihren eigenen Tresor (Code)
 * und gehören nicht in eine Datei, die herumgeschickt wird.
 *
 * Die Seite ist voll (vier Dateien unter 96 KB); diese Datei wird von
 * assets/ablehnung.js nachgeladen und liest die Seite über ihre globalen
 * Namen (MAILS, dbTx, jetztSpeichern, alles, DB). Fehlt sie, läuft alles
 * wie vorher, nur ohne Sicherung.
 */
(function (welt) {
  "use strict";
  var ART = "sendepruefer-sicherung", FASSUNG = 1;
  var ZULETZT = "sendepruefer_sicherung_zuletzt";   // app-eigen: github.io ist geteilt
  var SPAETER = "sendepruefer_sicherung_spaeter";    // sessionStorage: nur für diesen Besuch
  var ERINNERN_TAGE = 14;
  var MIN_PW = 8;
  var MITNEHMEN = ["sendepruefer_ablagen", "sendepruefer_aufgaben"];

  var API = welt.SPSicherung = { eingebaut: false, ART: ART, FASSUNG: FASSUNG, ERINNERN_TAGE: ERINNERN_TAGE, MIN_PW: MIN_PW };

  function T() { return welt.WERKSTATT_SCHLUESSEL; }
  function lies(k) { try { return localStorage.getItem(k) || ""; } catch (_e) { return ""; } }
  function schreib(k, v) { try { localStorage.setItem(k, v); } catch (_e) {} }
  function el(tag, attrs) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) e.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) if (arguments[i] != null) e.append(arguments[i]);
    return e;
  }
  function mails() { try { return MAILS; } catch (_e) { return []; } }
  function datum(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("de-DE") + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }

  /* ── Blob ⟷ base64 ── */
  function blobZuB64(b) {
    return b.arrayBuffer().then(function (buf) {
      var a = new Uint8Array(buf), s = "", i;
      for (i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return btoa(s);
    });
  }
  function b64ZuBlob(s, typ) {
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: typ || "application/octet-stream" });
  }

  /* ── Inhalt bauen und lesen (ohne Verschlüsselung, einzeln prüfbar) ── */
  function inhaltBauen(liste) {
    return Promise.all((liste || []).map(function (m) {
      var k = Object.assign({}, m);
      if (!Array.isArray(m.anhaenge) || !m.anhaenge.length) return k;
      return Promise.all(m.anhaenge.map(function (a) {
        var x = Object.assign({}, a); delete x.blob;
        if (!(a.blob instanceof Blob)) return x;
        return blobZuB64(a.blob).then(function (b64) { x.b64 = b64; return x; });
      })).then(function (an) { k.anhaenge = an; return k; });
    })).then(function (ms) {
      var extra = {};
      MITNEHMEN.forEach(function (key) { var v = lies(key); if (v) extra[key] = v; });
      return { art: ART, fassung: FASSUNG, erstellt: new Date().toISOString(), mails: ms, speicher: extra };
    });
  }
  function inhaltLesen(obj) {
    if (!obj || obj.art !== ART || !Array.isArray(obj.mails)) throw new Error("keine-sicherung");
    return obj.mails.map(function (m) {
      var k = Object.assign({}, m);
      if (Array.isArray(m.anhaenge)) k.anhaenge = m.anhaenge.map(function (a) {
        var x = Object.assign({}, a);
        if (typeof a.b64 === "string") { x.blob = b64ZuBlob(a.b64, a.typ); delete x.b64; }
        return x;
      });
      return k;
    });
  }
  API.inhaltBauen = inhaltBauen; API.inhaltLesen = inhaltLesen;

  /* ── Verschlüsseln / Entschlüsseln ── */
  function verschliessen(pw, liste) {
    if (!T()) return Promise.reject(new Error("schloss-fehlt"));
    return inhaltBauen(liste).then(function (inhalt) {
      return T().zu(pw, JSON.stringify(inhalt)).then(function (paket) {
        return { art: ART, fassung: FASSUNG, erstellt: inhalt.erstellt, paket: paket };
      });
    });
  }
  function oeffnen(pw, datei) {
    if (!T()) return Promise.reject(new Error("schloss-fehlt"));
    if (!datei || datei.art !== ART) return Promise.reject(new Error("keine-sicherung"));
    if (datei.fassung !== FASSUNG || !T().istPaketForm(datei.paket)) return Promise.reject(new Error(T().istPaketForm(datei.paket) ? "fassung" : "keine-sicherung"));
    return T().auf(pw, datei.paket).then(function (text) {
      var obj = JSON.parse(text);
      return { mails: inhaltLesen(obj), speicher: obj.speicher || {}, erstellt: obj.erstellt };
    }, function (e) { throw new Error(e && e.message === "fassung" ? "fassung" : "passwort"); });
  }
  API.verschliessen = verschliessen; API.oeffnen = oeffnen;

  /* ── Zurückholen: hinzufügen, nie überschreiben ── */
  function zusammenfuehren(geholt, speicher) {
    var da = new Set(mails().map(function (m) { return m.id; })), neu = [];
    geholt.forEach(function (m) { if (m && m.id && !da.has(m.id)) { da.add(m.id); neu.push(m); } });
    neu.forEach(function (m) { MAILS.push(m); try { jetztSpeichern(m); } catch (_e) {} });
    /* eigene Ordner und Aufgaben: fehlende kommen dazu */
    try {
      var ab = JSON.parse(lies("sendepruefer_ablagen") || "[]"), abN = JSON.parse((speicher || {}).sendepruefer_ablagen || "[]");
      var ids = new Set(ab.map(function (o) { return o.id; }));
      abN.forEach(function (o) { if (o && o.id && !ids.has(o.id)) ab.push(o); });
      if (ab.length) schreib("sendepruefer_ablagen", JSON.stringify(ab));
    } catch (_e) {}
    try {
      var au = JSON.parse(lies("sendepruefer_aufgaben") || "[]"), auN = JSON.parse((speicher || {}).sendepruefer_aufgaben || "[]");
      var txt = new Set(au.map(function (a) { return JSON.stringify(a); }));
      auN.forEach(function (a) { if (!txt.has(JSON.stringify(a))) au.push(a); });
      if (au.length) schreib("sendepruefer_aufgaben", JSON.stringify(au));
    } catch (_e) {}
    try { alles(); } catch (_e) {}
    return { dazu: neu.length, schonDa: geholt.length - neu.length };
  }
  API.zusammenfuehren = zusammenfuehren;

  /* ── Dauerhaft speichern (storage.persist) ── */
  function dauerStand() {
    var s = navigator.storage;
    if (!s || !s.persisted) return Promise.resolve("unbekannt");
    return s.persisted().then(function (ja) { return ja ? "ja" : "nein"; }, function () { return "unbekannt"; });
  }
  function dauerBitten() {
    var s = navigator.storage;
    if (!s || !s.persist) return Promise.resolve("unbekannt");
    return s.persist().then(function (ja) { return ja ? "ja" : "nein"; }, function () { return "unbekannt"; });
  }
  var DAUER_TEXT = {
    ja: "✓ Der Browser hält das Postfach dauerhaft — er löscht es nicht von selbst, wenn der Speicher knapp wird. Wer die Browserdaten löscht, löscht es trotzdem.",
    nein: "Der Browser darf das Postfach löschen, wenn der Speicher knapp wird. Eine installierte App bekommt den dauerhaften Speicher meist eher.",
    unbekannt: "Ob der Browser das Postfach dauerhaft hält, sagt er hier nicht."
  };

  /* ── Erinnerung ── */
  function eigene() { return mails().filter(function (m) { return !m.beispiel; }).length; }
  function tageSeit() { var z = Date.parse(lies(ZULETZT)); return isNaN(z) ? Infinity : (Date.now() - z) / 86400000; }
  function erinnernNoetig() {
    var spaeter = ""; try { spaeter = sessionStorage.getItem(SPAETER) || ""; } catch (_e) {}
    return eigene() > 0 && tageSeit() >= ERINNERN_TAGE && !spaeter;
  }
  API.erinnernNoetig = erinnernNoetig;
  function erinnerung() {
    var alt = document.getElementById("sicherung-erinnerung");
    if (alt) alt.remove();
    if (!erinnernNoetig()) return;
    var vor = document.querySelector("[data-zweck]") || document.getElementById("liste");
    if (!vor) return;
    var nie = tageSeit() === Infinity;
    var p = el("p", { id: "sicherung-erinnerung", class: "meldung warn", "data-sicherung-erinnerung": nie ? "nie" : "alt", role: "status" },
      nie ? "💾 Ihr Postfach ist noch nie gesichert. Löscht jemand die Browserdaten, sind die Mails weg. "
          : "💾 Die letzte Sicherung ist " + Math.floor(tageSeit()) + " Tage alt. ");
    var jetzt = el("button", { class: "knopf", type: "button", id: "sicherung-jetzt" }, "Jetzt sichern");
    var spaet = el("button", { class: "knopf", type: "button", id: "sicherung-spaeter" }, "Später");
    jetzt.addEventListener("click", function () { var d = document.getElementById("menue-dialog"); if (d && d.showModal) d.showModal(); var k = document.getElementById("sicherung-kasten"); if (k) { k.scrollIntoView(); var f = document.getElementById("sicherung-pw"); if (f) f.focus(); } });
    spaet.addEventListener("click", function () { try { sessionStorage.setItem(SPAETER, "1"); } catch (_e) {} p.remove(); });
    p.append(jetzt, " ", spaet);
    if (vor.id === "liste") vor.before(p); else vor.after(p);
  }
  API.erinnerung = erinnerung;

  /* ── Der Kasten im Menü ── */
  function stand() {
    var z = lies(ZULETZT), s = document.getElementById("sicherung-stand");
    if (s) s.textContent = z ? "Letzte Sicherung auf diesem Gerät: " + datum(z) + "." : "Auf diesem Gerät wurde noch keine Sicherung angelegt.";
  }
  function melde(id, text, gut) { var e = document.getElementById(id); if (e) { e.className = "meldung " + (gut ? "gut" : "warn"); e.textContent = text; } }
  var GRUND = {
    passwort: "Das Passwort passt nicht zu dieser Sicherung (oder die Datei ist beschädigt). Am Passwort lässt sich nichts zurückrechnen.",
    fassung: "Diese Sicherung stammt aus einer anderen Fassung der App und lässt sich hier nicht öffnen. Am Passwort liegt es nicht.",
    "keine-sicherung": "Das ist keine Sicherungsdatei des Sende-Prüfers.",
    "schloss-fehlt": "Das Schloss (assets/schluesseltresor.js) ist nicht geladen — nichts wurde gesichert. Einmal neu laden."
  };

  function einbauen() {
    var nach = document.getElementById("abschirm-kasten");
    if (!nach || document.getElementById("sicherung-kasten")) return;
    var pw = el("input", { id: "sicherung-pw", type: "password", autocomplete: "new-password", spellcheck: "false", "aria-label": "Passwort für die Sicherung" });
    var pw2 = el("input", { id: "sicherung-pw2", type: "password", autocomplete: "new-password", spellcheck: "false", "aria-label": "Passwort wiederholen" });
    var mach = el("button", { class: "knopf haupt", type: "button", id: "sicherung-machen" }, "🔐 Sicherung erstellen");
    var datei = el("input", { id: "sicherung-datei", type: "file", accept: ".json,application/json", hidden: "" });
    var waehle = el("label", { class: "knopf" }, "📂 Sicherung wählen …", datei);
    var pwz = el("input", { id: "sicherung-pw-zurueck", type: "password", autocomplete: "current-password", spellcheck: "false", "aria-label": "Passwort der Sicherung" });
    var hol = el("button", { class: "knopf haupt", type: "button", id: "sicherung-holen" }, "↩ Zurückholen");
    var dauer = el("button", { class: "knopf", type: "button", id: "sicherung-dauer" }, "Dauerhaft speichern lassen");
    var gewaehlt = null;

    var k = el("div", { class: "kasten", id: "sicherung-kasten", "data-sicherung": "" },
      el("h2", null, "🔐 Postfach sichern"),
      el("p", null, "Ihre Mails liegen nur in diesem Browser. Wer die Browserdaten löscht oder das Gerät wechselt, verliert sie. Eine Sicherung legt alle Mails samt Anhängen, eigenen Ordnern und eigenen Aufgaben in eine Datei — verschlüsselt mit einem eigenen Passwort. Die KI-Schlüssel kommen nicht mit; sie haben ihren eigenen Tresor."),
      el("p", { id: "sicherung-stand", "data-sicherung-stand": "" }),
      el("label", null, "Passwort für die Sicherung (mindestens " + MIN_PW + " Zeichen)", pw),
      el("label", null, "Passwort wiederholen", pw2),
      el("p", { "data-sicherung-warnung": "" }, "⚠ Das Passwort wird nirgends gespeichert. Ist es vergessen, lässt sich die Sicherung nicht mehr öffnen — von niemandem."),
      mach,
      el("p", { id: "sicherung-meldung", role: "status" }),
      el("h2", null, "↩ Zurückholen"),
      el("p", null, "Fehlende Mails kommen dazu. Was schon da ist, bleibt unverändert."),
      el("div", { class: "werkzeug" }, waehle, el("span", { id: "sicherung-dateiname" })),
      el("label", null, "Passwort der Sicherung", pwz),
      hol,
      el("p", { id: "sicherung-zurueck-meldung", role: "status" }),
      el("h2", null, "Speicher des Browsers"),
      el("p", { id: "sicherung-dauer-stand", "data-dauer": "" }),
      dauer);
    nach.before(k);

    mach.addEventListener("click", function () {
      if (pw.value.length < MIN_PW) return melde("sicherung-meldung", "Das Passwort braucht mindestens " + MIN_PW + " Zeichen.", false);
      if (pw.value !== pw2.value) return melde("sicherung-meldung", "Die beiden Passwörter sind nicht gleich.", false);
      dauerBitten().then(zeigeDauer);
      melde("sicherung-meldung", "Wird verschlüsselt …", true);
      var liste = mails().slice();
      verschliessen(pw.value, liste).then(function (d) {
        var tag = d.erstellt.slice(0, 10), name = "Sende-Pruefer-Sicherung-" + tag + ".json";
        var blob = new Blob([JSON.stringify(d)], { type: "application/json" });
        API.letzteDatei = { name: name, inhalt: d };
        var a = el("a", { href: URL.createObjectURL(blob), download: name });
        document.body.append(a); a.click(); a.remove();
        schreib(ZULETZT, d.erstellt);
        pw.value = pw2.value = "";
        stand(); erinnerung();
        melde("sicherung-meldung", "✓ " + liste.length + " Mail(s) gesichert in „" + name + "“ (Download-Ordner). Legen Sie die Datei an einen zweiten Ort — auf einen Stick, in Ihre Cloud oder per Mail an sich selbst. Ohne das Passwort ist sie nutzlos.", true);
      }, function (e) { melde("sicherung-meldung", GRUND[e && e.message] || "Die Sicherung ist nicht gelungen.", false); });
    });

    datei.addEventListener("change", function () {
      var f = datei.files && datei.files[0]; if (!f) return;
      document.getElementById("sicherung-dateiname").textContent = " " + f.name;
      f.text().then(function (t) { try { gewaehlt = JSON.parse(t); } catch (_e) { gewaehlt = null; } });
    });
    hol.addEventListener("click", function () {
      if (!gewaehlt) return melde("sicherung-zurueck-meldung", "Erst eine Sicherungsdatei wählen.", false);
      if (!pwz.value) return melde("sicherung-zurueck-meldung", "Das Passwort der Sicherung fehlt.", false);
      melde("sicherung-zurueck-meldung", "Wird geöffnet …", true);
      oeffnen(pwz.value, gewaehlt).then(function (r) {
        var z = zusammenfuehren(r.mails, r.speicher);
        pwz.value = "";
        erinnerung();
        var ohneDB = (function () { try { return !DB; } catch (_e) { return false; } })();
        melde("sicherung-zurueck-meldung", "✓ Sicherung vom " + datum(r.erstellt) + ": " + z.dazu + " Mail(s) dazu, " + z.schonDa + " waren schon da und bleiben unverändert." +
          (ohneDB ? " ⚠ Dieses Fenster kann nicht speichern — die Mails sind nur bis zum Schließen da." : ""), true);
      }, function (e) { melde("sicherung-zurueck-meldung", GRUND[e && e.message] || "Die Sicherung ließ sich nicht öffnen.", false); });
    });
    dauer.addEventListener("click", function () { dauerBitten().then(zeigeDauer); });

    function zeigeDauer(z) { var e = document.getElementById("sicherung-dauer-stand"); if (e) { e.dataset.dauer = z; e.textContent = DAUER_TEXT[z]; } dauer.hidden = z === "ja"; }
    dauerStand().then(zeigeDauer);
    stand();
    API.eingebaut = true;
  }

  function warten() {
    if (window.SendePruefer && window.SendePruefer.bereit === true) { einbauen(); erinnerung(); return; }
    setTimeout(warten, 100);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", warten); else warten();
})(window);

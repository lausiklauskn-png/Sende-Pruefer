/* Sende-Prüfer — Abschirmung gegen mitlesende Schreib-Helfer (Klaus 2026-09-29).
 *
 * App-eigen, KEINE Sage-Kopie. Zwei Aufgaben:
 *
 *  1 · ERKENNEN: die Seite beobachtet sich selbst. Hängt eine Erweiterung
 *      eigene Elemente hinein (ein iframe, ein eigenes Element wie
 *      <grammarly-desktop-integration>) oder setzt ihre Marken an Feld,
 *      body oder html (data-gr-ext-installed, data-lt-tmp-id …), wird das
 *      als Fund gemeldet — Banner, Knopf-Zahl und die FREMD-Lampe im Widget.
 *      Die Seite selbst legt nie ein iframe und nie ein eigenes Element an.
 *
 *  2 · ABSCHIRMEN mit einem Klick: an jedem Schreibfeld Rechtschreibprüfung,
 *      Autokorrektur und die KI-Schreibhilfe des Browsers aus
 *      (writingsuggestions="false"), dazu die Abschalt-Marken, auf die
 *      Grammarly und LanguageTool hören. Gilt auch für Felder, die später
 *      entstehen. Ein zweiter Klick stellt die alten Werte wieder her.
 *
 * GRENZE, und sie steht auch in der Seite: eine Erweiterung darf die Marken
 * übergehen, und Programme auf dem Gerät (Bildschirm, Zwischenablage) sieht
 * eine Webseite gar nicht. Fremde Nachrichten an die Seite weist die Membran
 * (Modul 15) ohnehin ab — dafür braucht es diese Datei nicht.
 */
(function (g) {
  "use strict";
  var KEY = "sendepruefer_abschirmung";
  var FELD = 'textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]),[contenteditable]:not([contenteditable="false"])';
  var AUS = { spellcheck: "false", autocomplete: "off", autocorrect: "off", autocapitalize: "off", writingsuggestions: "false",
    "data-gramm": "false", "data-gramm_editor": "false", "data-enable-grammarly": "false", "data-lt-active": "false" };
  /* Spuren bekannter Schreib-Erweiterungen. Keine davon setzt die Seite selbst. */
  var SPUREN = { "data-gr-ext-installed": "Grammarly", "data-new-gr-c-s-check-loaded": "Grammarly", "data-gr-id": "Grammarly",
    "data-lt-installed": "LanguageTool", "data-lt-tmp-id": "LanguageTool" };

  var funde = [], gesehen = {}, alt = new WeakMap(), an = false, abos = [];

  function lies() { try { return g.localStorage.getItem(KEY) === "an"; } catch (_e) { return false; } }
  function schreib(v) { try { g.localStorage.setItem(KEY, v ? "an" : "aus"); } catch (_e) { /* fail-soft */ } }

  function melde() {
    var membran = 0;
    try { membran = g.SbkimMembrane ? g.SbkimMembrane.fremdzugriff.list().length : 0; } catch (_e) { membran = 0; }
    try { g.dispatchEvent(new CustomEvent("sbkim:fremd-alert", { detail: { kind: "abschirmung", decision: "erkannt", bufferSize: funde.length + membran } })); } catch (_e) { /* fail-soft */ }
    abos.forEach(function (f) { try { f(); } catch (_e) { /* fail-soft */ } });
  }
  function fund(schluessel, text) {
    if (gesehen[schluessel]) return;
    gesehen[schluessel] = 1;
    funde.push({ was: text, wann: new Date().toISOString() });
    melde();
  }

  function pruefe(el) {
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName.toLowerCase();
    if (tag === "iframe") fund("iframe:" + (el.src || "leer"), "Ein fremdes Fenster (iframe) wurde in die Seite gelegt" + (el.src ? ": " + String(el.src).slice(0, 80) : "") + ".");
    else if (tag.indexOf("-") > 0) fund("tag:" + tag, "Ein fremdes Element wurde in die Seite gehängt: <" + tag + ">.");
    for (var a in SPUREN) if (el.hasAttribute(a)) fund("attr:" + a, SPUREN[a] + " liest in dieser Seite mit (Marke „" + a + "“).");
  }
  function pruefeBaum(el) {
    pruefe(el);
    if (el && el.querySelectorAll) { var alle = el.querySelectorAll("*"); for (var i = 0; i < alle.length; i++) pruefe(alle[i]); }
  }

  function schirme(feld) {
    if (!alt.has(feld)) {
      var vorher = {};
      for (var a in AUS) vorher[a] = feld.hasAttribute(a) ? feld.getAttribute(a) : null;
      alt.set(feld, vorher);
    }
    for (var b in AUS) feld.setAttribute(b, AUS[b]);
    feld.setAttribute("data-abgeschirmt", "");
  }
  function oeffne(feld) {
    var vorher = alt.get(feld);
    if (vorher) for (var a in vorher) { if (vorher[a] === null) feld.removeAttribute(a); else feld.setAttribute(a, vorher[a]); }
    alt.delete(feld);
    feld.removeAttribute("data-abgeschirmt");
  }
  function felder(wurzel) {
    var l = [];
    if (wurzel.matches && wurzel.matches(FELD)) l.push(wurzel);
    if (wurzel.querySelectorAll) l.push.apply(l, wurzel.querySelectorAll(FELD));
    return l;
  }

  function setze(v) {
    an = !!v; schreib(an);
    g.document.documentElement.dataset.abschirmung = an ? "an" : "aus";
    felder(g.document).forEach(an ? schirme : oeffne);
    abos.forEach(function (f) { try { f(); } catch (_e) { /* fail-soft */ } });
  }

  var beob = new MutationObserver(function (liste) {
    liste.forEach(function (m) {
      if (m.type === "attributes") { if (SPUREN[m.attributeName]) pruefe(m.target); return; }
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        pruefeBaum(n);
        if (an) felder(n).forEach(schirme);
      });
    });
  });

  function start() {
    pruefeBaum(g.document.documentElement);
    beob.observe(g.document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: Object.keys(SPUREN) });
    setze(lies());
  }

  g.SendeAbschirmung = {
    start: start,
    an: function () { return an; },
    setze: setze,
    umschalten: function () { setze(!an); },
    funde: function () { return funde.slice(); },
    abo: function (f) { abos.push(f); },
    AUS: AUS, SPUREN: SPUREN,
  };
})(window);

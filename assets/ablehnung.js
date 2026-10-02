/* Wenn der Anbieter ablehnt — app-eigener Klebstoff (Klaus 2026-09-29).
   Befund an Klaus' Tablet: Mistral antwortete „429 Rate limit exceeded".
   Das heisst: zu viele Anfragen in kurzer Zeit, nicht „kaputt".
   holen(): ein 429 wird EINMAL wiederholt, nach Retry-After (höchstens 30 s)
   oder nach 6 s — und das wird angesagt, nicht still gewartet.
   deuten(): ein Satz dazu, woran es liegt, nur wo es sich sagen lässt. */
(function () {
  "use strict";
  var WARTE = 6000, MAX = 30000;
  function wartezeit(antwort) {
    var s = Number(antwort.headers.get("retry-after"));
    return s > 0 ? Math.min(s * 1000, MAX) : WARTE;
  }
  async function holen(url, init, sag) {
    var antwort = await fetch(url, init);
    if (antwort.status !== 429) return antwort;
    var ms = wartezeit(antwort);
    sag("Der Anbieter meldet: zu viele Anfragen kurz hintereinander. Neuer Versuch in " + Math.round(ms / 1000) + " s …");
    await new Promise(function (r) { setTimeout(r, ms); });
    return fetch(url, init);
  }
  function deuten(status, grund, modell) {
    if (/subscription tier|not available/i.test(grund))
      return " — das Modell " + modell + " ist in Ihrem Tarif nicht freigeschaltet; am Guthaben liegt es nicht.";
    if (status === 429)
      return " — auch der zweite Versuch kam zu früh. Der Anbieter begrenzt, wie viele Anfragen in kurzer Zeit durchgehen; beim kostenlosen Zugang ist die Grenze niedrig. Eine Minute warten und noch einmal senden. Kommt es immer wieder, zeigt die Seite des Anbieters, ob ein Kontingent aufgebraucht ist.";
    if (status === 401)
      return " — der Schlüssel wird nicht angenommen. Beim Anbieter nachsehen, ob er noch gilt.";
    return "";
  }
  window.SPAblehnung = { holen: holen, deuten: deuten };
  /* Die Seite ist voll — assets/aussen.js (KI-Anweisungen in der Mail,
     Systemkanal und Marken) wird von hier nachgeladen. */
  if (typeof document !== "undefined") {
    var s = document.createElement("script"); s.src = "assets/aussen.js"; document.head.append(s);
    var p = document.createElement("script"); p.src = "assets/postfach.js"; document.head.append(p);
    var g = document.createElement("script"); g.src = "assets/sicherung.js"; document.head.append(g);
    var r = document.createElement("script"); r.src = "assets/empfaenger.js"; document.head.append(r);
  }
})();

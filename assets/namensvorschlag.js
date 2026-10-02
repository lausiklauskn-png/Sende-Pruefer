/* Namensvorschläge — app-eigener Klebstoff (Klaus 2026-10-02, Grenzen-Liste 4c:
   „gut, solange es ein Vorschlag bleibt").

   Unter „Weitere Namen“ stehen Namen, die Modul 25 im Text vermutet: nach
   Herr/Frau, aus der Begrüßung („Hallo Petra,“) und aus der Grußformel.
   ⚠ EIN VORSCHLAG VERDECKT NICHTS. Erst ein Tipp auf den Namen trägt ihn in
   „Weitere Namen“ ein — dann wird er verdeckt wie jeder andere Name dort.
   Schon bekannte Namen (Von, An, Cc, eingetragene) werden nicht vorgeschlagen.

   Die Seite ist voll (96 KB). Diese Datei ersetzt aktualisiere() der Seite und
   wird von assets/ablehnung.js nachgeladen. Fehlt sie oder kennt Modul 25 die
   Vorschläge nicht, läuft alles wie vorher. Namen sind Text, nie HTML. */
(function () {
  "use strict";
  if (typeof aktualisiere !== "function") return;
  var alt = aktualisiere;

  function vorschlaege(m) {
    var P = window.SbkimPseudonym;
    if (!P || typeof P.suggestNames !== "function" || !m) return [];
    try { return P.suggestNames(ganzeMail(m), { values: mailNamen(m) }); } catch (_e) { return []; }
  }

  function uebernehmen(m, name) {
    var liste = namenListe(m.namenExtra);
    if (liste.indexOf(name) < 0) liste.push(name);
    m.namenExtra = liste.join(", ");
    var feld = document.getElementById("namen");
    if (feld) feld.value = m.namenExtra;
    geaendert(m);
  }

  window.aktualisiere = function (m) {
    alt(m);
    var auto = document.getElementById("namen-auto");
    if (!auto || !auto.parentNode) return;
    var box = document.getElementById("namen-vorschlag");
    if (!box) {
      box = document.createElement("div");
      box.id = "namen-vorschlag"; box.className = "gedaempft"; box.dataset.namenVorschlag = "";
      auto.parentNode.insertBefore(box, auto.nextSibling);
    }
    var vs = vorschlaege(m);
    box.dataset.anzahl = String(vs.length);
    box.hidden = vs.length === 0;
    box.replaceChildren();
    if (!vs.length) return;
    var satz = document.createElement("span");
    satz.textContent = "Vorschlag aus dem Text — verdeckt erst nach einem Tipp:";
    box.append(satz);
    vs.forEach(function (v) {
      var k = document.createElement("button");
      k.type = "button"; k.className = "knopf"; k.style.margin = "4px 0 0 6px";
      k.dataset.keinUe = ""; k.dataset.vorschlag = v.name; k.dataset.grund = v.grund;
      k.textContent = "＋ " + v.name;
      k.addEventListener("click", function () { uebernehmen(m, v.name); });
      box.append(k);
    });
  };

  window.SPNamensvorschlag = { eingebaut: true, vorschlaege: vorschlaege };
})();

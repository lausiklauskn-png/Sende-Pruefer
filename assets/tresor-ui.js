/* Tresor für den KI-Schlüssel — app-eigener Klebstoff (Klaus 2026-09-29):
   „nur noch den kurzen Code eingeben". Das Schloss ist schluesseltresor.js,
   byte-1:1 aus kim-hub-company (AES-256-GCM, PBKDF2-SHA256 600 000 Runden).
   Abgelegt wird NUR das verschlossene Paket, je Anbieter unter
   sendepruefer_tresor_<anbieter>. Code und offener Schlüssel bleiben im
   Arbeitsspeicher, solange die Seite offen ist — nie in einer Ablage. */
(function () {
  "use strict";
  var PREFIX = "sendepruefer_tresor_", KLAR = "sendepruefer_key_", MIN = 4;
  var offen = {};                                   // Anbieter → offener Schlüssel, nur im Speicher
  var $ = function (id) { return document.getElementById(id); };
  var S = function () { return window.WERKSTATT_SCHLUESSEL; };
  function lies(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_e) { return null; } }
  function weg(k) { try { localStorage.removeItem(k); } catch (_e) {} }
  var p = function () { return ($("anbieter") || {}).value || "anthropic"; };
  var paket = function () { var d = lies(PREFIX + p()); return S() && S().istPaketForm(d) ? d : null; };
  function sag(t, art) { var e = $("tresor-meldung"); if (e) { e.className = "meldung" + (art ? " " + art : ""); e.textContent = t; } }
  function zeigen() {
    var da = !!paket(), schl = $("schluessel");
    if (!schl) return;
    if (!schl.value && offen[p()]) schl.value = offen[p()];
    $("tresor-auf").hidden = !da || !!schl.value;
    $("tresor-zu").hidden = !schl.value;
    $("tresor").dataset.lage = da ? (schl.value ? "offen" : "zu") : "leer";
    sag(!S() ? "Das Schloss (schluesseltresor.js) ist nicht geladen — der Tresor geht nicht."
      : da ? (schl.value ? "Im Tresor liegt ein Schlüssel für diesen Anbieter. Er ist für diesen Besuch geöffnet."
                         : "Im Tresor liegt ein Schlüssel für diesen Anbieter. Code eingeben und öffnen.")
      : "Einmal mit einem Code ablegen — danach genügt der Code. Code mindestens " + MIN + " Zeichen; je länger, desto schwerer zu erraten.",
      !S() ? "warn" : "");
  }
  function ablegen() {
    var code = $("tresor-code").value, schl = $("schluessel").value.trim();
    if (!schl) return sag("Erst den Schlüssel oben eintragen.", "warn");
    if (code.length < MIN) return sag("Der Code braucht mindestens " + MIN + " Zeichen.", "warn");
    S().zu(code, schl).then(function (pk) {
      localStorage.setItem(PREFIX + p(), JSON.stringify(pk));
      weg(KLAR + p());                              // der alte Klartext-Eintrag verschwindet
      offen[p()] = schl; $("tresor-code").value = "";
      zeigen(); sag("Im Tresor abgelegt. Beim nächsten Besuch genügt der Code.", "gut");
    }, function () { sag("Ablegen ging nicht.", "warn"); });
  }
  function oeffnen() {
    var code = $("tresor-code").value, pk = paket();
    if (!pk) return zeigen();
    if (!code) return sag("Bitte den Code eingeben.", "warn");
    sag("Wird geöffnet …");
    S().auf(code, pk).then(function (schl) {
      offen[p()] = schl; $("schluessel").value = schl; $("tresor-code").value = "";
      zeigen(); sag("Geöffnet. Der Schlüssel bleibt nur, solange diese Seite offen ist.", "gut");
    }, function (e) {
      sag(e && e.message === "fassung" ? "Dieses Paket stammt aus einer anderen Fassung und lässt sich hier nicht öffnen."
        : "Der Code passt nicht.", "warn");
    });
  }
  function einbauen() {
    var schl = $("schluessel");
    if (!schl || $("tresor")) return zeigen();
    var box = document.createElement("div");
    box.id = "tresor"; box.className = "tresor";
    box.innerHTML = '<label for="tresor-code">🔒 Tresor-Code</label>'
      + '<input id="tresor-code" type="password" autocomplete="off" spellcheck="false" enterkeyhint="done">'
      + '<div class="werkzeug"><button class="knopf" id="tresor-auf" type="button">🔓 Mit Code öffnen</button>'
      + '<button class="knopf" id="tresor-zu" type="button">🔒 Im Tresor ablegen</button></div>'
      + '<p class="meldung" id="tresor-meldung"></p>';
    var nach = $("schluessel-holen") || schl;
    nach.parentNode.insertBefore(box, nach.nextSibling);
    $("tresor-auf").addEventListener("click", oeffnen);
    $("tresor-zu").addEventListener("click", ablegen);
    $("tresor-code").addEventListener("keydown", function (e) { if (e.key === "Enter") (paket() && !schl.value ? oeffnen : ablegen)(); });
    schl.addEventListener("input", zeigen);
    $("anbieter").addEventListener("change", zeigen);
    $("schluessel-weg").addEventListener("click", function () { weg(PREFIX + p()); delete offen[p()]; zeigen(); });
    zeigen();
  }
  window.SPTresor = { einbauen: einbauen, PREFIX: PREFIX, MIN: MIN };
})();

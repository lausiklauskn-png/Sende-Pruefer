/* Prioritätenliste (Stufe 1 der Abhakliste, Klaus 2026-10-05).
 *
 * Der Nutzer sagt, was ihm wichtig ist: Firmengeheimnisse, Bankdaten,
 * Kundendaten, Zugänge, Verträge und Preise, eigene Wörter. Je Gruppe eine
 * Stufe: streng · normal · aus. Daraus folgen zwei Dinge:
 *   1. Die Gruppe wird in Texten gesucht (feste Wortliste + eigene Wörter).
 *   2. Befunde des Prüfkerns, die zu einer Gruppe gehören, tragen ihre Stufe.
 *
 * Drei Zusicherungen:
 *   - Jeder Treffer sagt, WIE er zustande kam: welche Wortliste, welches Wort,
 *     welche Stufe. Eine Wortliste trifft auch ein Wort, das nur zitiert wird.
 *   - Es steht nie eine Entwarnung da. Jeder Treffer trägt eine Empfehlung.
 *   - „aus" schaltet nur die Wortsuche dieser Gruppe ab. Ein Befund des
 *     Prüfkerns wird dadurch nie versteckt.
 *
 * Host-neutral: kein DOM in der Rechnung, der Speicher-Schlüssel wird
 * übergeben (hier inout_prioritaeten_v1). Die Oberfläche (baueEinstellungen)
 * setzt nur textContent. Gespeichert wird nur auf diesem Gerät. */
(function (g) {
  "use strict";
  var STUFEN = ["streng", "normal", "aus"];
  var GRUPPEN = [
    { id: "geheim", name: "Firmengeheimnisse", woerter: ["vertraulich", "streng vertraulich", "intern", "nur intern", "geheim", "NDA",
      "Verschwiegenheit", "nicht weitergeben", "Betriebsgeheimnis", "Geschäftsgeheimnis"] },
    { id: "bank", name: "Bankdaten und Zahlungen", woerter: ["IBAN", "BIC", "Kontonummer", "Bankverbindung", "Kontoauszug",
      "Überweisung", "Lastschrift", "Kreditkarte"], kennungen: ["KONTO-WECHSEL", "RECHNUNGSDATEN", "IBAN", "BETRAG", "RECHNUNG"] },
    { id: "kunden", name: "Kundendaten", woerter: ["Kundennummer", "Kundenliste", "Kundendaten", "Geburtsdatum", "Adressliste",
      "Personalausweis", "Krankenkasse"], kennungen: ["PERSONENBEZUG", "NAME", "MAIL", "TELEFON"] },
    { id: "zugang", name: "Passwörter und Zugänge", woerter: ["Passwort", "Kennwort", "PIN", "Zugangsdaten", "Login", "TAN",
      "API-Key", "Benutzername"], kennungen: ["SCHLUESSEL", "ZUGANGSDATEN"] },
    { id: "vertrag", name: "Verträge und Preise", woerter: ["Vertrag", "Angebot", "Preisliste", "Rabatt", "Kalkulation",
      "Einkaufspreis", "Marge", "Konditionen"] },
    { id: "eigen", name: "Eigene Wörter", woerter: [] }
  ];
  var EMPFEHLUNG = {
    eingang: {
      streng: "Lies diese Stelle selbst, bevor du antwortest oder etwas weitergibst. Kommt sie unerwartet, frag beim Absender auf einem anderen Weg nach.",
      normal: "Schau kurz, ob diese Stelle zu dem passt, was du erwartest."
    },
    ausgang: {
      streng: "Prüfe, ob diese Stelle wirklich hinaus muss. Wenn nicht: streichen oder umschreiben, dann erst senden.",
      normal: "Lies die Stelle vor dem Senden noch einmal. Muss sie mit?"
    }
  };
  /* Branchen-Vorlagen: nur Vorschläge, der Nutzer ändert sie danach frei. */
  var VORLAGEN = {
    handwerk: { name: "Handwerk / Werbetechnik", stufen: { geheim: "normal", bank: "streng", kunden: "normal", zugang: "streng", vertrag: "streng", eigen: "normal" },
      eigen: ["Aufmaß", "Druckdaten", "Lieferantenpreis"] },
    studio: { name: "Kosmetikstudio", stufen: { geheim: "normal", bank: "streng", kunden: "streng", zugang: "streng", vertrag: "normal", eigen: "normal" },
      eigen: ["Hautbild", "Unverträglichkeit", "Behandlungsplan"] },
    buero: { name: "Büro / Verwaltung", stufen: { geheim: "streng", bank: "streng", kunden: "streng", zugang: "streng", vertrag: "streng", eigen: "normal" },
      eigen: ["Personalakte", "Gehalt"] },
    privat: { name: "Privat", stufen: { geheim: "aus", bank: "streng", kunden: "aus", zugang: "streng", vertrag: "normal", eigen: "normal" },
      eigen: [] }
  };
  function grundstand() {
    var s = {}; GRUPPEN.forEach(function (gr) { s[gr.id] = gr.id === "eigen" ? "normal" : gr.id === "vertrag" || gr.id === "geheim" ? "normal" : "streng"; });
    return { fassung: 1, stufen: s, eigen: [] };
  }
  function sauber(st) {
    var g0 = grundstand();
    if (!st || typeof st !== "object") return g0;
    GRUPPEN.forEach(function (gr) { var v = st.stufen && st.stufen[gr.id]; if (STUFEN.indexOf(v) >= 0) g0.stufen[gr.id] = v; });
    if (Array.isArray(st.eigen)) g0.eigen = st.eigen.map(function (w) { return String(w).trim(); }).filter(function (w) { return w.length >= 2 && w.length <= 60; }).slice(0, 50);
    return g0;
  }
  function laden(schluessel) {
    try { return sauber(JSON.parse(localStorage.getItem(schluessel) || "null")); } catch (_e) { return grundstand(); }
  }
  function speichern(schluessel, st) {
    var s = sauber(st);
    try { localStorage.setItem(schluessel, JSON.stringify(s)); } catch (_e) {}
    return s;
  }
  function vorlage(id) { var v = VORLAGEN[id]; return v ? sauber({ stufen: v.stufen, eigen: v.eigen }) : null; }
  function gruppe(id) { for (var i = 0; i < GRUPPEN.length; i++) if (GRUPPEN[i].id === id) return GRUPPEN[i]; return null; }
  function gruppeVon(kennung) {
    for (var i = 0; i < GRUPPEN.length; i++) if ((GRUPPEN[i].kennungen || []).indexOf(kennung) >= 0) return GRUPPEN[i];
    return null;
  }
  function esc(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  /* Wortgrenze per Buchstaben-Klasse, nicht \b — \b kennt kein „ü". */
  function muster(w) { return new RegExp("(^|[^\\p{L}\\p{N}])(" + esc(w) + ")(?=$|[^\\p{L}\\p{N}])", "iu"); }

  /* treffer(texte, stand, richtung) → [{gruppe, gruppeName, stufe, wort, stelle, satz, empfehlung, kennung:"PRIORITAET"}]
     texte: [{text, stelle}] — stelle ist eine Vorsilbe wie „Seite 2" oder „Anhang x". */
  function treffer(texte, stand, richtung) {
    var st = sauber(stand), aus = [], dir = EMPFEHLUNG[richtung] ? richtung : "eingang";
    GRUPPEN.forEach(function (gr) {
      var stufe = st.stufen[gr.id];
      if (stufe === "aus") return;
      var liste = gr.id === "eigen" ? st.eigen : gr.woerter;
      liste.forEach(function (w) {
        var re = muster(w);
        (texte || []).forEach(function (t) {
          String(t.text || "").split(/\r?\n/).forEach(function (zeile, i) {
            var m = re.exec(zeile); if (!m) return;
            var stelle = (t.stelle ? t.stelle + ", " : "") + "Zeile " + (i + 1);
            aus.push({ kennung: "PRIORITAET", gruppe: gr.id, gruppeName: gr.name, stufe: stufe, wort: m[2], stelle: stelle,
              satz: "„" + m[2] + "\" steht in deiner Prioritätenliste unter „" + gr.name + "\" (Stufe " + stufe + "). Gefunden über eine feste " +
                (gr.id === "eigen" ? "Liste deiner eigenen Wörter" : "Wortliste") + " — ein Wort, das nur zitiert oder verneint wird, wird ebenso gefunden.",
              empfehlung: EMPFEHLUNG[dir][stufe] });
          });
        });
      });
    });
    return aus;
  }
  /* Ein Befund des Prüfkerns bekommt die Stufe seiner Gruppe. „aus" heißt hier
     nur: kein Zusatz. Der Befund selbst bleibt, wie er ist. */
  function stufeFuer(kennung, stand) {
    var gr = gruppeVon(kennung); if (!gr) return null;
    var stufe = sauber(stand).stufen[gr.id];
    return stufe === "aus" ? null : { gruppe: gr.id, gruppeName: gr.name, stufe: stufe };
  }

  /* ── Oberfläche: nur textContent ── */
  function baueEinstellungen(box, schluessel, beiAenderung) {
    var d = box.ownerDocument;
    function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    var st = laden(schluessel);
    function melde() { st = speichern(schluessel, st); if (beiAenderung) beiAenderung(st); zeichne(); }
    function zeichne() {
      box.replaceChildren();
      box.setAttribute("data-prioritaeten", "");
      box.appendChild(el("p", "leise", "Was dir wichtig ist. Jede Gruppe wird in Mails, Texten und Dateien gesucht — eingehend und hinausgehend. " +
        "„streng\" hält beim Hinausgehen an, „normal\" weist nur hin, „aus\" sucht die Wörter nicht. Befunde der Prüfung bleiben immer stehen. " +
        "Gespeichert wird nur auf diesem Gerät."));
      var v = el("div", "reihe"); v.setAttribute("data-prio-vorlagen", "");
      v.appendChild(el("span", "leise", "Vorlage:"));
      Object.keys(VORLAGEN).forEach(function (id) {
        var b = el("button", "btn leicht", VORLAGEN[id].name); b.type = "button"; b.setAttribute("data-prio-vorlage", id);
        b.addEventListener("click", function () { st = vorlage(id); melde(); });
        v.appendChild(b);
      });
      box.appendChild(v);
      GRUPPEN.forEach(function (gr) {
        var z = el("fieldset", "prio-gruppe"); z.setAttribute("data-prio-gruppe", gr.id);
        z.appendChild(el("legend", "", gr.name));
        STUFEN.forEach(function (s) {
          var l = el("label", "prio-stufe"), r = d.createElement("input");
          r.type = "radio"; r.name = "prio-" + gr.id; r.value = s; r.checked = st.stufen[gr.id] === s;
          r.addEventListener("change", function () { st.stufen[gr.id] = s; melde(); });
          l.appendChild(r); l.appendChild(d.createTextNode(" " + s)); z.appendChild(l);
        });
        var w = gr.id === "eigen" ? st.eigen : gr.woerter;
        z.appendChild(el("p", "leise", w.length ? "Wörter: " + w.join(" · ") : "Noch keine eigenen Wörter."));
        if (gr.kennungen) z.appendChild(el("p", "leise", "Dazu gehören Befunde der Prüfung wie Bankverbindung, Personenangaben oder Schlüssel — sie tragen dann diese Stufe."));
        if (gr.id === "eigen") {
          var f = d.createElement("input"); f.type = "text"; f.id = "prioEigen"; f.placeholder = "Wort oder Ausdruck, z. B. Projekt Nordlicht";
          var add = el("button", "btn", "Hinzufügen"); add.type = "button"; add.id = "prioEigenAdd";
          add.addEventListener("click", function () { var x = f.value.trim(); if (x.length < 2) { f.focus(); return; } if (st.eigen.indexOf(x) < 0) st.eigen.push(x); melde(); });
          var r2 = el("div", "reihe"); r2.appendChild(f); r2.appendChild(add); z.appendChild(r2);
          st.eigen.forEach(function (x) {
            var b = el("button", "btn leicht", "✕ " + x); b.type = "button"; b.setAttribute("data-prio-weg", x);
            b.addEventListener("click", function () { st.eigen = st.eigen.filter(function (y) { return y !== x; }); melde(); });
            z.appendChild(b);
          });
        }
        box.appendChild(z);
      });
      box.appendChild(el("p", "leise", "Grenze: gesucht wird nach festen Wörtern. Ein umschriebenes Geheimnis fällt durch, ein Zitat wird gefunden. " +
        "Die Liste ist noch nicht in einer Sicherung enthalten."));
    }
    zeichne();
    return { stand: function () { return st; } };
  }

  g.Prioritaeten = { STUFEN: STUFEN, GRUPPEN: GRUPPEN, VORLAGEN: VORLAGEN, EMPFEHLUNG: EMPFEHLUNG, grundstand: grundstand, sauber: sauber,
    laden: laden, speichern: speichern, vorlage: vorlage, gruppe: gruppe, gruppeVon: gruppeVon, treffer: treffer, stufeFuer: stufeFuer,
    baueEinstellungen: baueEinstellungen };
})(typeof window !== "undefined" ? window : globalThis);

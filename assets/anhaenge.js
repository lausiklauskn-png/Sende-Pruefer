/* Sende-Prüfer — Anhänge prüfen (Klaus 2026-09-28: „Anhänge, hin und zurück").
 *
 * Eine Mail bekommt Anhänge (📎, oder aus einer .eml mit Anhang). Jeder
 * Anhang wird geprüft: was steckt darin, das man nicht sieht? Die Prüfung
 * läuft auf dem Gerät, nichts davon geht ins Netz.
 *
 * ⚠ KEIN VIRENSCANNER UND KEINE STEGANOGRAFIE-SUCHE. Gesucht werden
 * Strukturen, die sich ohne Deutung erkennen lassen: Daten hinter dem
 * Bildende, Metadaten, Skripte, Makros, Aktionen, Verweise nach außen, eine
 * Endung, die nicht zum Dateikopf passt — und Angaben im TEXT einer Datei
 * (SVG, Word, Excel, PowerPoint), die Modul 25 wie im Mailtext findet.
 *
 * ⚠ BENANNTE GRENZEN dieser Fassung: Text IN einem Bild liest seit Stufe 2 A
 * die Texterkennung auf dem Gerät (Tesseract aus vendor/tesseract/); liest sie
 * nichts, heißt es „Text im Bild ungeprüft", nie sauber. Der Seitentext eines PDFs schon (bis 100 Seiten, pdf.js aus
 * vendor/pdfjs/) — fehlt pdf.js, heißt er „ungeprüft". An die KI geht weiterhin
 * nur der Mailtext, keine Datei.
 *
 * ⚠ DIE SEITE BLEIBT UNBERÜHRT. Sie ist voll (96 KB für vier Dateien); diese
 * Datei hängt sich über einen Beobachter in die Leseansicht und liest die
 * Mail über die globalen Namen des Seiten-Skripts (aktuell, jetztSpeichern,
 * finde, mailNamen). Fehlt diese Datei, läuft die Seite wie vorher.
 *
 * Die Prüfung selbst steht in assets/pruefer-anhang.js, PDF-Befunde in
 * assets/pruefer-formate.js, die KI-Anweisungen in assets/pruefer-mail.js —
 * alle drei byte-1:1 aus dem Auslieferungsprüfer,
 * dort pflegen, hier neu kopieren. Diese Datei trägt nur die Oberfläche.
 */
(function (welt) {
  "use strict";

  /* ══ DER PRÜFTEIL STEHT IN assets/pruefer-anhang.js — byte-1:1 aus dem
   * Auslieferungsprüfer, dort gepflegt, hier per SHA-256 gepinnt
   * (Klaus 2026-09-29: „bitte so"). Diese Datei trägt nur noch die
   * Oberfläche. Die Seite ist voll; der Prüfteil wird deshalb von HIER
   * nachgeladen, nicht über eine eigene Zeile in der Seite. */
  if (typeof document === "undefined") return;
  /* Reihenfolge: PDF-Prüfer → Mail-Prüfer (trägt die Liste der
   * KI-Anweisungen, die auch im Seitentext eines PDFs gesucht wird) →
   * Anhang-Prüfer. Fehlt einer der ersten zwei, läuft es weiter — der
   * Anhang-Prüfer nennt dann, was ungeprüft blieb. */
  function laden(pfad, da) {
    return da() ? Promise.resolve(true) : new Promise(function (res) {
      var s = document.createElement("script"); s.src = pfad;
      s.onload = function () { res(!!da()); }; s.onerror = function () { res(false); };
      document.head.append(s);
    });
  }
  var bereit = laden("assets/pruefer-formate.js", function () { return welt.PrueferFormate; })
    .then(function () { return laden("assets/pruefer-mail.js", function () { return welt.PrueferMail; }); })
    .then(function () { return laden("assets/pruefer.js", function () { return welt.Auslieferungspruefer; }); })
    .then(function () { return laden("assets/pruefer-anhang.js", function () { return welt.PrueferAnhang; }); })
    .then(function (da) {
      if (!da) throw new Error("fehlt");
      /* pdf.js liegt im eigenen Ordner vendor/pdfjs/ (Klaus 2026-09-30: die
       * App läuft für sich allein, ohne Workflow PDF daneben). Nicht im
       * Installations-Vorrat; geholt erst, wenn ein PDF kommt. */
      if (welt.PrueferAnhang.pfade) welt.PrueferAnhang.pfade({ pdfjs: new URL("vendor/pdfjs/", location.href).href, tesseract: new URL("vendor/tesseract/", location.href).href });
      return welt.PrueferAnhang;
    });
  function pruefe(name, bytes) {
    return bereit.then(function (A) { return A.pruefe(name, bytes); }, function () {
      return { art: "unbekannt", artName: "nicht geprüft", befunde: [], text: "", sicher: false,
        hinweise: ["Der Anhang-Prüfer (assets/pruefer-anhang.js) ist nicht geladen — dieser Anhang ist UNGEPRÜFT, nicht sauber."] };
    });
  }
  function artVon(b) { return welt.PrueferAnhang ? welt.PrueferAnhang.artVon(b) : "unbekannt"; }
  function gross(n) { return welt.PrueferAnhang ? welt.PrueferAnhang.gross(n) : n + " Bytes"; }
  var API = welt.SPAnhangUI = {};

  /* ══ SICHERE FASSUNG — ein Bild wird auf einer Leinwand neu gezeichnet.
   * Übrig bleiben nur die Bildpunkte: keine Metadaten, kein Anhängsel, bei
   * SVG kein Skript. Eine SVG wird dabei zum PNG. */
  function sichereFassung(a) {
    var ist = artVon(new Uint8Array(0));
    return a.blob.arrayBuffer().then(function (x) {
      ist = artVon(new Uint8Array(x));
      var blob = ist === "svg" ? new Blob([x], { type: "image/svg+xml" }) : new Blob([x], { type: a.typ || "image/*" });
      var url = URL.createObjectURL(blob);
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(img); }; img.onerror = function () { rej(new Error("Das Bild ließ sich nicht zeichnen.")); };
        img.src = url;
      }).then(function (img) {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth || 800, h = img.naturalHeight || 600, c = document.createElement("canvas");
        c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
        var png = ist === "png" || ist === "svg" || ist === "gif";
        return new Promise(function (res) { c.toBlob(res, png ? "image/png" : "image/jpeg", 0.92); }).then(function (neu) {
          var stamm = String(a.name).replace(/\.[^.]*$/, "") || "bild";
          return { blob: neu, name: stamm + "-sicher." + (png ? "png" : "jpg") };
        });
      });
    });
  }

  /* ══ OBERFLÄCHE */
  var g = function (n) { try { return welt.eval("typeof " + n + " !== 'undefined' ? " + n + " : null"); } catch (_e) { return null; } };
  function el(tag, attrs) {
    var e = document.createElement(tag), k;
    for (k in attrs || {}) { var v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
    for (var i = 2; i < arguments.length; i++) if (arguments[i] != null) e.append(arguments[i]);   // Namen sind Text, nie HTML
    return e;
  }
  var ergebnisse = new Map();                     // Anhang-id → Promise<Ergebnis>
  function ergebnis(a) {
    if (!ergebnisse.has(a.id)) ergebnisse.set(a.id, a.blob.arrayBuffer().then(function (x) { return pruefe(a.name, x); }));
    return ergebnisse.get(a.id);
  }
  function neueId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function speichern(m) { var f = g("jetztSpeichern"); if (f) f(m); }
  function hinzufuegen(m, dateien) {
    m.anhaenge = m.anhaenge || [];
    for (var i = 0; i < dateien.length; i++) {
      var d = dateien[i];
      m.anhaenge.push({ id: neueId(), name: d.name || "anhang", typ: d.type || "", groesse: d.size, blob: d });
    }
    speichern(m); zeichne();
  }
  function herunterladen(blob, name) {
    var a = document.createElement("a"), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    welt.__spAnhangLetzter = name;
  }

  /* Welche Datei nimmt DIESER Browser beim Teilen an? Gefragt wird mit
     navigator.canShare — derselben Frage, die Chrome, Safari (iOS) und Edge
     beantworten; eine Liste von Dateiarten je Browser wird nicht geraten.
     Drei Ausgänge: "ja" · "nein" · "ohne" (der Browser kann gar nicht teilen). */
  function teilbar(a) {
    if (!navigator.share) return "ohne";
    if (!navigator.canShare) return "nein";
    try { return navigator.canShare({ files: [new File([a.blob], a.name, { type: a.typ || a.blob.type || "" })] }) ? "ja" : "nein"; }
    catch (_e) { return "nein"; }
  }
  var TEILBAR_TEXT = { ja: "📤 geht beim Teilen mit", nein: "✗ dieser Browser teilt diese Art nicht — nur über „Als .eml speichern“ oder ⬇ einzeln", ohne: "Teilen gibt es in diesem Browser nicht — nur über „Als .eml speichern“ oder ⬇ einzeln" };

  function zeile(m, a) {
    var li = el("li", { class: "anhang", "data-anhang": a.id },
      el("div", { class: "anhang-kopf" }, el("b", { class: "anhang-name" }, a.name),
        el("span", { class: "gedaempft", "data-anhang-art": "" }, " · " + gross(a.groesse || 0) + " · wird geprüft …")));
    var liste = el("ul", { class: "befunde anhang-befunde" }), fuss = el("div", { class: "werkzeug", style: "margin:6px 0 0" }),
      meldung = el("p", { class: "meldung", "data-anhang-meldung": "" });
    var tb = teilbar(a);
    li.dataset.teilbar = tb;
    li.append(el("p", { "data-teilbar": tb, style: "margin:4px 0 0" }, TEILBAR_TEXT[tb]), liste, fuss, meldung);
    ergebnis(a).then(function (r) {
      var finde = g("finde"), mailNamen = g("mailNamen");
      var funde = r.text && finde ? finde(r.text, mailNamen ? mailNamen(m) : []) : [];
      li.dataset.befunde = String(r.befunde.length); li.dataset.angaben = String(funde.length); li.dataset.art = r.art;
      li.querySelector("[data-anhang-art]").textContent = " · " + gross(a.groesse || 0) + " · " + r.artName;
      r.befunde.forEach(function (x) { liste.append(el("li", { "data-kennung": x.kennung }, el("span", { class: "sorte" }, x.kennung), x.satz)); });
      if (funde.length) {
        var z = {}; funde.forEach(function (f) { z[f.sorte] = (z[f.sorte] || []).concat(f.wert); });
        liste.append(el("li", { "data-kennung": "ANHANG-ANGABEN" }, el("span", { class: "sorte" }, "ANGABEN"),
          "Im Text der Datei stehen " + funde.length + " Angabe(n), die im Mailtext verdeckt würden: " +
          Object.keys(z).map(function (s) { return z[s].length + "× " + s + " (" + z[s].slice(0, 3).join(", ") + ")"; }).join(" · ") +
          ". In der Datei selbst bleiben sie stehen."));
      }
      if (!r.befunde.length && !funde.length) liste.append(r.bildUngeprueft
        ? el("li", { "data-kennung": "UNGEPRUEFT" }, "Text im Bild ungeprüft — die Texterkennung hat nichts sicher gelesen. Das heißt nicht, dass nichts darin steht.")
        : el("li", { "data-kennung": "OHNE" }, "Nichts gefunden von dem, wonach gesucht wird."));
      r.hinweise.forEach(function (h) { liste.append(el("li", { class: "gedaempft", "data-hinweis": "" }, h)); });
      if (r.sicher) fuss.append(el("button", { class: "knopf", type: "button", "data-sicher": "", onclick: function () {
        sichereFassung(a).then(function (s) {
          herunterladen(s.blob, s.name);
          meldung.className = "meldung gut";
          meldung.textContent = "Gespeichert: " + s.name + " (" + gross(s.blob.size) + "). Neu gezeichnet — " +
            (r.befunde.length ? "entfernt ist: " + r.befunde.map(function (x) { return x.kennung; }).join(", ") + "." : "Metadaten und Anhängsel fallen dabei weg.");
        }, function (e) { meldung.className = "meldung warn"; meldung.textContent = e.message; });
      } }, "🧼 Sichere Fassung speichern"));
    }, function () { li.querySelector("[data-anhang-art]").textContent = " · nicht lesbar — ungeprüft, nicht sauber"; });
    fuss.append(el("button", { class: "knopf", type: "button", "data-laden": "", title: "Diese Datei einzeln speichern, um sie im Mail-Programm von Hand anzuhängen", onclick: function () {
      herunterladen(a.blob, a.name);
      meldung.className = "meldung gut"; meldung.textContent = "Gespeichert: " + a.name + ". Im Mail-Programm über die Büroklammer anhängen.";
    } }, "⬇ Einzeln speichern"));
    fuss.append(el("button", { class: "knopf", type: "button", "data-weg": "", onclick: function () {
      m.anhaenge = (m.anhaenge || []).filter(function (x) { return x.id !== a.id; }); ergebnisse.delete(a.id); speichern(m); zeichne();
    } }, "Entfernen"));
    return li;
  }

  /* Vor dem Tippen sagen, was wohin mitgeht — nicht erst in der Meldung danach. */
  function wegeUebersicht(m) {
    var L = m.anhaenge || [];
    if (!L.length) return null;
    var ja = L.filter(function (a) { return teilbar(a) === "ja"; }), nein = L.filter(function (a) { return teilbar(a) !== "ja"; });
    var p = el("div", { class: "gedaempft", "data-anhang-wege": "", style: "margin:8px 0 0" });
    p.append(el("p", { style: "margin:0" }, "📤 Teilen: " + (ja.length ? "mit geht " + namenListe(ja) : "kein Anhang geht mit") +
      (nein.length ? ". Dieser Browser nimmt nicht an: " + namenListe(nein) + " — die bleiben beim Teilen automatisch weg." : ".")));
    p.append(el("p", { style: "margin:4px 0 0" }, "💾 „Als .eml speichern“: ALLE Anhänge sind in der Datei. Die .eml ist die ganze Mail als Paket — öffnen Sie sie mit einem Mail-Programm (Outlook, Thunderbird). Hängen Sie sie nicht an eine neue Mail: dann kommt beim Empfänger nur diese eine Datei an."));
    return p;
  }

  function abschnitt(m) {
    var eingabe = el("input", { type: "file", id: "anhang-datei", multiple: true, hidden: true,
      onchange: function (e) { var f = Array.prototype.slice.call(e.target.files || []); e.target.value = ""; if (f.length) hinzufuegen(m, f); } });
    var liste = el("ul", { class: "anhang-liste", id: "anhang-liste" });
    (m.anhaenge || []).forEach(function (a) { liste.append(zeile(m, a)); });
    return el("section", { class: "kasten", id: "anhaenge", "data-anhaenge": "" },
      el("h2", null, "📎 Anhänge"),
      el("p", { class: "gedaempft", "data-anhang-zweck": "" }, "Damit eine Datei nicht mehr verrät, als Sie weitergeben wollen: jeder Anhang wird hier auf dem Gerät geprüft — auf versteckte Daten hinter einem Bild, Metadaten wie Ort und Kamera, Skripte, Makros, Verweise nach außen und Angaben im Text. Bilder lassen sich als sichere Fassung neu zeichnen."),
      liste,
      wegeUebersicht(m),
      m.anhaengeGeerbt && (m.anhaenge || []).length ? el("p", { class: "gedaempft", "data-anhang-geerbt": "" }, "Aus der Mail übernommen, auf die diese Antwort zurückgeht. Sie gehen beim Speichern und Teilen mit — „Entfernen“, wenn einer nicht mit soll.") : null,
      el("div", { class: "werkzeug", style: "margin:8px 0 0" }, el("label", { class: "knopf", for: "anhang-datei" }, "📎 Anhang hinzufügen"), eingabe),
      el("p", { class: "gedaempft", "data-anhang-grenze": "" }, "Grenze: kein Virenscanner und keine Suche nach Botschaften, die in Bildpunkten versteckt sind. Text in Bildern liest die Texterkennung auf dem Gerät (bis 10 gescannte Seiten, 90 s je Bild); den Seitentext eines PDFs liest die Prüfung (bis 100 Seiten) und hält die ersten 10 Seiten gegen ihr Bild — was im Text steht, aber nicht zu sehen ist, wird gemeldet. An die KI geht nur der Mailtext, keine Datei."));
  }

  function zeichne() {
    var box = document.getElementById("lesen"), aktuell = g("aktuell");
    if (!box || !aktuell) return;
    var m = aktuell(), alt = document.getElementById("anhaenge");
    if (!m) { if (alt) alt.remove(); return; }
    mitnehmen(m);
    var neu = abschnitt(m);
    if (alt) { alt.replaceWith(neu); return; }
    var ki = document.getElementById("ki-oeffnen"), anker = ki && ki.closest(".werkzeug");
    if (anker) anker.before(neu);
  }
  function beobachten() {
    var box = document.getElementById("lesen");
    if (!box) return;
    new MutationObserver(function () { if (!document.getElementById("anhaenge") && document.getElementById("ki-oeffnen")) zeichne(); })
      .observe(box, { childList: true });
    zeichne();
  }

  /* ══ .eml MIT ANHANG — die Seite liest nur den Text; die Teile mit
   * Dateinamen holt diese Datei heraus und hängt sie an die neue Mail. */
  function emlAnhaenge(roh) {
    var kopfTeilen = g("kopfTeilen"), vonB64 = g("vonB64"), vonQP = g("vonQP"), kopfWort = g("kopfWort");
    if (!kopfTeilen || !vonB64) return [];
    var aus = [];
    (function teil(k, rumpf, tiefe) {
      if (tiefe > 6) return;
      var ct = k["content-type"] || "", gr = /boundary="?([^";]+)"?/i.exec(ct);
      if (/^multipart\//i.test(ct) && gr) {
        rumpf.split("--" + gr[1]).slice(1).filter(function (t) { return !/^--/.test(t); }).forEach(function (t) {
          var x = kopfTeilen(t.replace(/^\r?\n/, "")); teil(x.k, x.rumpf, tiefe + 1);
        });
        return;
      }
      var cd = k["content-disposition"] || "";
      var nm = /filename\*?="?([^";]+)"?/i.exec(cd) || /name="?([^";]+)"?/i.exec(ct);
      if (!nm) return;
      var name = kopfWort ? kopfWort(nm[1]) : nm[1];
      if (/^utf-8''/i.test(name)) try { name = decodeURIComponent(name.replace(/^utf-8''/i, "")); } catch (_e) {}
      var cte = (k["content-transfer-encoding"] || "").toLowerCase().trim();
      var bytes = cte === "base64" ? vonB64(rumpf) : cte === "quoted-printable" && vonQP ? vonQP(rumpf) : new TextEncoder().encode(rumpf);
      aus.push(new File([bytes], name, { type: ct.split(";")[0].trim() }));
    })(kopfTeilen(String(roh).replace(/^﻿/, "")).k, kopfTeilen(String(roh).replace(/^﻿/, "")).rumpf, 0);
    return aus;
  }
  function emlBeobachten() {
    var inp = document.getElementById("einfuegen-datei");
    if (!inp) return;
    inp.addEventListener("change", function (e) {        // läuft VOR dem Seiten-Skript, das das Feld leert
      var f = e.target.files && e.target.files[0], MAILS0 = g("MAILS");
      if (!f) return;
      var vorher = MAILS0 ? MAILS0.map(function (x) { return x.id; }) : [];
      f.text().then(function (roh) {
        var dateien = emlAnhaenge(roh); if (!dateien.length) return;
        var versuche = 0;
        (function warte() {
          var MAILS = g("MAILS") || [], neu = MAILS.filter(function (x) { return vorher.indexOf(x.id) < 0; }).pop();
          if (neu) { hinzufuegen(neu, dateien); return; }
          if (++versuche < 40) setTimeout(warte, 50);
        })();
      });
    });
  }
  API.emlAnhaenge = emlAnhaenge; API.sichereFassung = sichereFassung;

  /* ══ ANHÄNGE GEHEN MIT HINAUS (Klaus 2026-09-29: „beim Teilen der E-Mail
   * wird der Anhang nicht mitgenommen … die .eml im Mail-Programm geöffnet,
   * der Anhang ist nicht da"). Die Seite baut .eml und Teilen nur aus dem
   * Text; hier werden ihre zwei Wege ersetzt, sobald eine Mail Anhänge hat.
   * Ohne Anhang läuft ihr eigener Weg unverändert.
   *
   * Eine KI-Antwort übernimmt die Anhänge der Mail, aus der sie entstand —
   * EINMAL, als eigene Kopie, sichtbar in ihrem 📎-Abschnitt und dort zu
   * entfernen. Wer sie entfernt, bekommt sie nicht wieder. */
  function mitnehmen(m) {
    if (!m) return [];
    if ((!m.anhaenge || !m.anhaenge.length) && !m.anhaengeGeerbt && m.bezug) {
      var b = (g("MAILS") || []).filter(function (x) { return x.id === m.bezug; })[0];
      if (b && b.anhaenge && b.anhaenge.length) {
        m.anhaenge = b.anhaenge.map(function (a) { return { id: neueId(), name: a.name, typ: a.typ, groesse: a.groesse, blob: a.blob }; });
        m.anhaengeGeerbt = b.id; speichern(m);
      }
    }
    return m.anhaenge || [];
  }
  function zahlText(n) { return n === 1 ? "1 Anhang" : n + " Anhänge"; }
  function b64(bytes) {
    var s = "", i;
    for (i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/.{76}/g, "$&\r\n");
  }
  function kopfName(n) {
    n = String(n || "anhang");
    if (/^[\x20-\x7e]*$/.test(n)) return n.replace(/["\\]/g, "_");
    var enc = g("b64utf8");
    return enc ? "=?UTF-8?B?" + enc(n) + "?=" : n.replace(/[^\x20-\x7e]|["\\]/g, "_");
  }
  /* multipart/mixed: der Text wie bisher, jeder Anhang base64. Name im
     kodierten Wort (RFC 2047) UND in filename* (RFC 2231) — Outlook, Gmail
     und Thunderbird lesen jeweils eines davon. */
  function emlMitAnhang(m, liste) {
    var roh = g("emlBauen")(m), i = roh.indexOf("\r\n\r\n"), grenze = "----=_SendePruefer_" + neueId();
    var kopf = roh.slice(0, i).replace(/^Content-Type: [^\r\n]*/m, 'Content-Type: multipart/mixed; boundary="' + grenze + '"')
      .replace(/^Content-Transfer-Encoding: [^\r\n]*\r\n/m, "");
    return Promise.all(liste.map(function (a) { return a.blob.arrayBuffer(); })).then(function (inhalte) {
      var teile = [kopf, "", "--" + grenze, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: 8bit", "", roh.slice(i + 4)];
      liste.forEach(function (a, k) {
        var nm = kopfName(a.name), stern = "UTF-8''" + encodeURIComponent(String(a.name || "anhang")).replace(/['()*]/g, function (z) { return "%" + z.charCodeAt(0).toString(16).toUpperCase(); });
        teile.push("--" + grenze, "Content-Type: " + (a.typ || "application/octet-stream") + '; name="' + nm + '"', "Content-Transfer-Encoding: base64",
          'Content-Disposition: attachment; filename="' + nm + '"; filename*=' + stern, "", b64(new Uint8Array(inhalte[k])));
      });
      teile.push("--" + grenze + "--", "");
      return teile.join("\r\n");
    });
  }
  function melde(t, gut) { var f = g("meldeAktion"); if (f) f(t, gut); }
  function namenListe(l) { return l.map(function (x) { return x.name; }).join(", "); }
  function exportEinbauen() {
    var altSpeichern = g("emlSpeichern"), altTeilen = g("teilen"), emlName = g("emlName");
    if (!altSpeichern || !altTeilen || !emlName || !g("emlBauen")) return;
    welt.emlSpeichern = function (m) {
      var L = mitnehmen(m);
      if (!L.length) return altSpeichern(m);
      return emlMitAnhang(m, L).then(function (roh) {
        var f = new File([roh], emlName(m), { type: "message/rfc822" });
        herunterladen(f, f.name);
        welt.__letzteEml = { name: f.name, weg: "download", anhaenge: L.map(function (x) { return x.name; }) };
        var ex = g("exportiert"); if (ex) ex(m);
        melde("Gespeichert als " + f.name + ", mit " + zahlText(L.length) + " (" + namenListe(L) + "). Die Datei ist die ganze Mail als Paket: mit einem Mail-Programm öffnen (Outlook, Thunderbird), nicht an eine neue Mail hängen — sonst kommt nur diese eine Datei an. Am Tablet oder Handy ist „Teilen“ der Weg.", true);
      }, function (e) { melde("Die Anhänge ließen sich nicht lesen (" + (e && e.message || e) + "). Nichts gespeichert.", false); });
    };
    welt.teilen = function (m) {
      var L = mitnehmen(m);
      if (!L.length || !navigator.share) return altTeilen(m);
      var d = { title: m.betreff || "E-Mail", text: String(m.text || "") }, geht = [], nicht = [];
      L.forEach(function (a) {                 // ohne Warten: Teilen braucht den frischen Tipp
        var f = new File([a.blob], a.name, { type: a.typ || a.blob.type || "" }), ja = false;
        try { ja = !!navigator.canShare && navigator.canShare({ files: [f] }); } catch (_e) {}
        (ja ? geht : nicht).push(f);
      });
      if (geht.length) d.files = geht;
      var an = m.anAdr ? " Den Empfänger (" + m.anAdr + ") tragen Sie im Mail-Programm ein." : "";
      var rest = nicht.length ? " NICHT mitgenommen, weil dieser Browser diese Art beim Teilen abweist: " + namenListe(nicht) + ". Hängen Sie sie im Mail-Programm von Hand an (⬇ Einzeln speichern am Anhang) oder nehmen Sie „Als .eml speichern“ — dort ist alles dabei." : "";
      return navigator.share(d).then(function () {
        welt.__letzteEml = { name: emlName(m), weg: "teilen", anhaenge: geht.map(function (x) { return x.name; }) };
        var ex = g("exportiert"); if (ex) ex(m);
        melde("Geteilt: Betreff, Text" + (geht.length ? " und " + zahlText(geht.length) + " (" + namenListe(geht) + ")" : ", ohne Anhang") + "." + rest + an, !nicht.length);
      }, function (x) {
        if (x && x.name === "AbortError") return;
        melde("Das Teilen ging nicht (" + (x && x.name || x) + "). Speichern Sie die Mail mit „Als .eml speichern“ — die Anhänge sind dabei.", false);
      });
    };
  }
  API.emlMitAnhang = emlMitAnhang; API.mitnehmen = mitnehmen; API.teilbar = teilbar; API.zeichne = function () { zeichne(); };

  function start() {
    document.head.append(el("style", null, ".anhang-liste{list-style:none;padding:0;margin:8px 0}.anhang{border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);padding:8px 0}.anhang-name{overflow-wrap:anywhere}.anhang-befunde{margin:6px 0 0}"));
    exportEinbauen();
    beobachten();
  }
  /* SOFORT, nicht erst nach dem Laden: das Seiten-Skript leert das Feld in
     SEINEM change-Zuhörer — wer danach kommt, findet keine Datei mehr. */
  emlBeobachten();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(typeof window !== "undefined" ? window : globalThis);

/* Auslieferungsprüfer — Anhänge und einzelne Dateien öffnen und prüfen.
 * (Klaus 2026-09-29: „Ist das nicht dann dem Auslieferungsprüfer …?" — „bitte so".)
 *
 * ⚠ HIER WIRD GEPFLEGT. Diese Datei steht byte-1:1 im Sende-Prüfer
 * (assets/pruefer-anhang.js, dort per SHA-256 gepinnt). Wer sie ändert,
 * ändert sie HIER, kopiert sie dorthin und zieht den Pin nach.
 * Einen Python-Zwilling hat sie nicht — benannte Grenze.
 *
 * Was sie prüft: Strukturen, die sich ohne Deutung erkennen lassen — Daten
 * hinter dem Bildende, Metadaten, Skripte in SVG, Makros und Verweise in
 * Office-Dateien, Programme, eine Endung, die nicht zum Dateikopf passt.
 * PDFs gehen an assets/pruefer-formate.js. Den TEXT einer Datei (SVG, Word,
 * Excel, PowerPoint) gibt sie heraus; wer ihn weiterprüft, entscheidet die App.
 *
 * ⚠ KEIN VIRENSCANNER. ⚠ BENANNTE GRENZE: in Bildpunkten versteckte
 * Botschaften werden NICHT gelesen. Der Seitentext eines PDFs wird seit
 * Stufe 2 D (2026-09-29) gelesen — mit pdf.js, das die App nachlädt
 * (pfade({pdfjs})). Fehlt es, bleibt der Seitentext UNGEPRÜFT und das steht da.
 * Text IN einem Bild (PNG, JPEG, WebP, GIF) und auf PDF-Seiten ohne Textebene
 * liest seit Stufe 2 A (2026-09-30) die Texterkennung (Tesseract, von der App
 * nachgeladen: pfade({tesseract})). Liest sie nichts Sicheres, steht „Text im
 * Bild ungeprüft" da — nie „kein Befund".
 *
 * ausMail(roh) packt die Anhänge einer Mail aus: base64 und quoted-printable,
 * Namen nach RFC 2047/2231. Nichts davon wird ausgeführt oder angezeigt; eine
 * Datei über GROESSE_MAX wird nicht geöffnet, sondern benannt.
 *
 * Läuft in Browser und Node, ohne Oberfläche.
 */
(function (welt) {
  "use strict";

  var BEFUNDE = ["ANHANG-TARNUNG", "ANHANG-PROGRAMM", "BILD-ANHAENGSEL", "BILD-METADATEN",
    "SVG-SKRIPT", "SVG-VERWEIS", "OFFICE-MAKRO", "OFFICE-VERWEIS", "OFFICE-EINBETTUNG",
    "PDF-VERWEIS", "PDF-AKTION", "PDF-ANHANG", "PDF-METADATEN", "PDF-ALTFASSUNG", "PDF-KI-ANWEISUNG", "BILD-KI-ANWEISUNG"];

  function alsBytes(b) { return b instanceof Uint8Array ? b : new Uint8Array(b || []); }
  function latin1(b, von, bis) {
    var s = "", e = Math.min(bis == null ? b.length : bis, b.length);
    for (var i = von || 0; i < e; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, Math.min(i + 32768, e)));
    return s;
  }
  var u16 = function (b, i) { return b[i] | (b[i + 1] << 8); };
  var u32 = function (b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; };
  var b32 = function (b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; };
  function gross(n) { return n < 1024 ? n + " Bytes" : n < 1048576 ? (n / 1024).toFixed(1).replace(".", ",") + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB"; }

  /* ══ WAS IST ES WIRKLICH? — am Dateikopf, nicht an der Endung */
  function artVon(b) {
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "png";
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "jpeg";
    if (b.length >= 6 && latin1(b, 0, 4) === "GIF8") return "gif";
    if (b.length >= 12 && latin1(b, 0, 4) === "RIFF" && latin1(b, 8, 12) === "WEBP") return "webp";
    if (latin1(b, 0, 5) === "%PDF-") return "pdf";
    if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B && b[2] === 3 && b[3] === 4) return "zip";
    if (b[0] === 0x4D && b[1] === 0x5A) return "programm";               // MZ: Windows-Programm
    if (b[0] === 0x7F && latin1(b, 1, 4) === "ELF") return "programm";
    if (latin1(b, 0, 2) === "#!") return "programm";
    var anf = latin1(b, 0, 1024).replace(/^﻿|^\xEF\xBB\xBF/, "").trimStart();
    if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(anf)) return "svg";
    if (istText(b)) return "text";
    return "unbekannt";
  }
  /* Klaus 2026-09-30, Vorlage H1 als Mail-Anhang: eine .txt kam als „unbekannte
     Art" an, und ihr Inhalt wurde NICHT durchsucht — im Reiter „Textdatei"
     fand dieselbe Datei vier Befunde. Text ist, was sich als UTF-8 lesen lässt
     und keine Steuerzeichen trägt (außer Tab, Zeilenende, Seitenvorschub). */
  function istText(b) {
    if (!b.length || typeof TextDecoder === "undefined") return false;
    var t;
    try { t = new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(0, Math.min(b.length, 65536))); }
    catch (e) { if (b.length > 65536) { try { t = new TextDecoder("utf-8").decode(b.subarray(0, 65532)); } catch (e2) { return false; } } else return false; }
    return !/[\x00-\x08\x0E-\x1F\x7F]/.test(t);
  }
  var ART_NAME = { png: "PNG-Bild", jpeg: "JPEG-Bild", gif: "GIF-Bild", webp: "WebP-Bild", pdf: "PDF",
    zip: "ZIP-Archiv", docx: "Word-Dokument", xlsx: "Excel-Tabelle", pptx: "PowerPoint", svg: "SVG-Grafik", text: "Textdatei",
    programm: "ausführbares Programm", unbekannt: "unbekannte Art" };
  var ENDUNGEN = { png: ["png"], jpeg: ["jpg", "jpeg", "jfif"], gif: ["gif"], webp: ["webp"], pdf: ["pdf"],
    svg: ["svg"], zip: ["zip", "docx", "docm", "xlsx", "xlsm", "pptx", "pptm", "odt", "ods", "odp", "epub"] };
  var PROGRAMM_ENDUNG = /\.(exe|scr|com|bat|cmd|ps1|vbs|vbe|js|jse|wsf|hta|msi|lnk|jar|apk|sh|dll|cpl|reg)$/i;

  /* ══ BILDER */
  function jpegPruefen(b, melde) {
    var i = 2, ende = -1, meta = [];
    while (i + 4 <= b.length) {
      if (b[i] !== 0xFF) break;
      var mk = b[i + 1];
      if (mk === 0xFF) { i++; continue; }
      if (mk === 0xD9) { ende = i + 2; break; }
      if (mk >= 0xD0 && mk <= 0xD7 || mk === 0x01) { i += 2; continue; }
      var len = (b[i + 2] << 8) | b[i + 3];
      var inhalt = latin1(b, i + 4, Math.min(i + 4 + 40, b.length));
      if (mk === 0xE1 && inhalt.indexOf("Exif\0") === 0) {
        var gps = exifHatGps(b, i + 10, Math.min(i + 2 + len, b.length));
        meta.push("EXIF (Kamera, Aufnahmezeit" + (gps ? ", Ortsangabe GPS" : "") + ")");
      } else if (mk === 0xE1 && inhalt.indexOf("http://ns.adobe.com/xap/") === 0) meta.push("XMP");
      else if (mk === 0xED) meta.push("IPTC/Photoshop");
      else if (mk === 0xFE) meta.push("Kommentar");
      if (mk === 0xDA) {                         // Bilddaten: bis zum echten Ende suchen
        var j = i + 2 + len;
        while (j + 1 < b.length) {
          if (b[j] === 0xFF && b[j + 1] === 0xD9) { ende = j + 2; break; }
          j++;
        }
        break;
      }
      i += 2 + len;
    }
    if (meta.length) melde("BILD-METADATEN", "Im Bild stehen Metadaten: " + meta.join(", ") + ".");
    return ende;
  }
  /* GPS nur, wenn IFD0 wirklich den Verweis 0x8825 trägt — eine geratene
     Ortsangabe wäre eine falsche Warnung über den Aufnahmeort. */
  function exifHatGps(b, t, bis) {
    if (t + 8 > bis) return false;
    var le = b[t] === 0x49, r16 = function (i) { return le ? u16(b, i) : (b[i] << 8) | b[i + 1]; },
      r32 = function (i) { return le ? u32(b, i) : b32(b, i); };
    var ifd = t + r32(t + 4); if (ifd + 2 > bis) return false;
    var n = r16(ifd);
    for (var k = 0; k < n && ifd + 2 + k * 12 + 2 <= bis; k++) if (r16(ifd + 2 + k * 12) === 0x8825) return true;
    return false;
  }
  function pngPruefen(b, melde) {
    var i = 8, ende = -1, meta = [];
    while (i + 12 <= b.length) {
      var len = b32(b, i), typ = latin1(b, i + 4, i + 8);
      if (typ === "tEXt" || typ === "iTXt" || typ === "zTXt") {
        var schl = latin1(b, i + 8, Math.min(i + 8 + len, i + 8 + 80)).split("\0")[0];
        meta.push("Text „" + schl + "“");
      } else if (typ === "eXIf") meta.push("EXIF");
      i += 12 + len;
      if (typ === "IEND") { ende = i; break; }
    }
    if (meta.length) melde("BILD-METADATEN", "Im Bild stehen Metadaten: " + meta.join(", ") + ".");
    return ende;
  }
  function webpPruefen(b, melde) {
    var ende = 8 + u32(b, 4), i = 12, meta = [];
    while (i + 8 <= Math.min(ende, b.length)) {
      var typ = latin1(b, i, i + 4), len = u32(b, i + 4);
      if (typ === "EXIF") meta.push("EXIF"); else if (typ === "XMP ") meta.push("XMP");
      i += 8 + len + (len & 1);
    }
    if (meta.length) melde("BILD-METADATEN", "Im Bild stehen Metadaten: " + meta.join(", ") + ".");
    return ende;
  }
  function anhaengsel(b, ende, melde) {
    if (ende < 0 || ende >= b.length) return;
    var rest = b.subarray(ende), leer = true;
    for (var k = 0; k < rest.length; k++) if (rest[k] !== 0 && rest[k] !== 10 && rest[k] !== 13 && rest[k] !== 32) { leer = false; break; }
    if (leer && rest.length <= 64) return;       // Füllbytes einiger Programme
    var kopf = latin1(rest, 0, 4096), was = "";
    if (/ftyp(mp4|isom|qt)/.test(kopf) || /MotionPhoto|MicroVideo/i.test(latin1(b, 0, 65536))) was = " — vermutlich ein Bewegungsfoto (Video)";
    else if (/SEF[HT]/.test(latin1(rest, Math.max(0, rest.length - 64)))) was = " — vermutlich Zusatzdaten einer Samsung-Kamera";
    else if (rest[0] === 0x50 && rest[1] === 0x4B) was = " — dort beginnt ein ZIP-Archiv";
    else if (latin1(rest, 0, 5) === "%PDF-") was = " — dort beginnt ein PDF";
    melde("BILD-ANHAENGSEL", "Hinter dem Ende des Bildes stehen noch " + gross(rest.length) +
      " Daten" + was + ". Kein Bildbetrachter zeigt sie, mitgeschickt werden sie trotzdem.");
  }

  /* ══ SVG — Text, kein Bild: darin kann ein Skript stehen */
  function svgPruefen(b, melde) {
    var s = new TextDecoder("utf-8").decode(b);
    if (/<script[\s>]/i.test(s)) melde("SVG-SKRIPT", "Die Grafik enthält ein Skript (<script>). Im Browser geöffnet läuft es.");
    var h = s.match(/\son[a-z]+\s*=/i);
    if (h) melde("SVG-SKRIPT", "Die Grafik enthält einen Ereignis-Auslöser (" + h[0].trim().replace(/\s*=$/, "") + "=…).");
    if (/javascript:/i.test(s)) melde("SVG-SKRIPT", "Die Grafik enthält eine javascript:-Adresse.");
    if (/<foreignObject[\s>]/i.test(s)) melde("SVG-SKRIPT", "Die Grafik bettet fremdes HTML ein (<foreignObject>).");
    var wirte = {}, re = /(?:href|src)\s*=\s*["']\s*((?:https?:)?\/\/([A-Za-z0-9.\-]+))/gi, m;
    while ((m = re.exec(s)) !== null) {
      var w = m[2].toLowerCase(); if (w === "www.w3.org" || wirte[w]) continue;
      wirte[w] = 1; melde("SVG-VERWEIS", "Die Grafik lädt etwas von einem fremden Rechner: " + w);
    }
    var text = s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    return entitaeten(text).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  }
  function entitaeten(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_a, n) { return String.fromCodePoint(+n); })
      .replace(/&#x([0-9a-f]+);/gi, function (_a, n) { return String.fromCodePoint(parseInt(n, 16)); })
      .replace(/&amp;/g, "&");
  }

  /* ══ ZIP / OFFICE — das Inhaltsverzeichnis am Ende der Datei */
  function zipEintraege(b) {
    var e = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) return null;
    var n = u16(b, e + 10), p = u32(b, e + 16), liste = [];
    for (var k = 0; k < n && p + 46 <= b.length; k++) {
      if (u32(b, p) !== 0x02014b50) break;
      var nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32);
      liste.push({ name: new TextDecoder("utf-8").decode(b.subarray(p + 46, p + 46 + nl)), art: u16(b, p + 10),
        gepackt: u32(b, p + 20), roh: u32(b, p + 24), lokal: u32(b, p + 42) });
      p += 46 + nl + xl + cl;
    }
    return liste;
  }
  function zipLesen(b, e) {
    if (e.roh > 8 * 1048576) return Promise.resolve(null);   // Deckel: 8 MB entpackt
    var p = e.lokal; if (u32(b, p) !== 0x04034b50) return Promise.resolve(null);
    var daten = b.subarray(p + 30 + u16(b, p + 26) + u16(b, p + 28)).subarray(0, e.gepackt);
    if (e.art === 0) return Promise.resolve(daten);
    if (e.art !== 8 || typeof welt.DecompressionStream !== "function") return Promise.resolve(null);
    return Promise.resolve().then(function () {
      var ds = new welt.DecompressionStream("deflate-raw"), w = ds.writable.getWriter();
      w.write(daten).catch(function () {}); w.close().catch(function () {});
      return new Response(ds.readable).arrayBuffer();
    }).then(function (x) { return new Uint8Array(x); }, function () { return null; });
  }
  function officePruefen(b, name, melde) {
    var liste = zipEintraege(b);
    if (!liste) return Promise.resolve({ art: "zip", text: null, hinweis: "Das Inhaltsverzeichnis des Archivs ist nicht lesbar." });
    var namen = liste.map(function (x) { return x.name; });
    var art = namen.some(function (n) { return /^word\//.test(n); }) ? "docx" : namen.some(function (n) { return /^xl\//.test(n); }) ? "xlsx"
      : namen.some(function (n) { return /^ppt\//.test(n); }) ? "pptx" : "zip";
    var makro = namen.filter(function (n) { return /vbaProject\.bin$|\.bin$/i.test(n) && /vba/i.test(n); });
    if (makro.length) melde("OFFICE-MAKRO", "Die Datei enthält Makros (" + makro[0] + "). Makros sind Programme, die beim Öffnen laufen können.");
    var eingebettet = namen.filter(function (n) { return /\/embeddings\/|\/oleObject/i.test(n); });
    if (eingebettet.length) melde("OFFICE-EINBETTUNG", "In der Datei stecken " + eingebettet.length + " eingebettete Datei(en), z. B. " + eingebettet[0].split("/").pop() + ".");
    var prog = namen.filter(function (n) { return PROGRAMM_ENDUNG.test(n); });
    if (prog.length) melde("ANHANG-PROGRAMM", "Im Archiv liegt eine ausführbare Datei: " + prog[0]);
    var textTeile = liste.filter(function (x) {
      return /^word\/(document|header\d*|footer\d*|footnotes|comments)\.xml$/.test(x.name) || /^xl\/sharedStrings\.xml$/.test(x.name)
        || /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(x.name) || /^docProps\/core\.xml$/.test(x.name);
    });
    var rels = liste.filter(function (x) { return /\.rels$/.test(x.name); });
    var texte = [], wirte = {}, unlesbar = 0;
    var kette = Promise.resolve();
    rels.concat(textTeile).slice(0, 80).forEach(function (e) {
      kette = kette.then(function () { return zipLesen(b, e); }).then(function (roh) {
        if (!roh) { unlesbar++; return; }
        var xml = new TextDecoder("utf-8").decode(roh);
        if (/\.rels$/.test(e.name)) {
          var re = /<Relationship\b[^>]*>/g, m;
          while ((m = re.exec(xml)) !== null) {
            if (!/TargetMode="External"/.test(m[0])) continue;
            var ziel = (/Target="([^"]*)"/.exec(m[0]) || [])[1] || "";
            var wm = /^(?:https?:|file:)?\/\/([^/"]+)/i.exec(ziel), wirt = wm ? wm[1].toLowerCase() : ziel.slice(0, 60);
            if (wirte[wirt]) continue; wirte[wirt] = 1;
            melde("OFFICE-VERWEIS", "Die Datei verweist auf etwas außerhalb: " + wirt +
              (/attachedTemplate|oleObject|frame/i.test(m[0]) ? " (wird beim Öffnen geladen)" : ""));
          }
        } else if (/core\.xml$/.test(e.name)) {
          var au = /<dc:creator>([^<]{1,120})<\/dc:creator>/.exec(xml), lm = /<cp:lastModifiedBy>([^<]{1,120})<\/cp:lastModifiedBy>/.exec(xml);
          if (au || lm) texte.push([au && au[1], lm && lm[1]].filter(Boolean).map(entitaeten).join("\n"));
        } else {
          texte.push(entitaeten(xml.replace(/<\/(w:p|a:p|si)>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "")).trim());
        }
      });
    });
    return kette.then(function () {
      return { art: art, text: texte.filter(Boolean).join("\n"), hinweis: unlesbar ? unlesbar + " Teil(e) des Archivs waren nicht lesbar — die sind ungeprüft, nicht sauber." : "" };
    });
  }

  /* ══ DER SEITENTEXT EINES PDFs (Stufe 2 D, Klaus 2026-09-29)
   * pdf.js liest die Textebene jeder Seite. Es wird NICHT mitgeliefert (1,5 MB),
   * sondern von der App nachgeladen: pfade({pdfjs: "<Ordner>/"}) — im Netz
   * liegt es neben Workflow PDF. Steht schon ein pdfjsLib da (Node-Probe),
   * wird das genommen.
   * ⚠ isEvalSupported: false. pdf.js 3.x konnte mit einer präparierten Schrift
   *   eigenen Code ausführen (CVE-2024-4367); ohne eval geht dieser Weg nicht.
   * ⚠ Höchstens SEITEN_TEXT_MAX Seiten; was dahinter liegt, wird benannt.
   * Die Anweisungen an eine KI sucht dieselbe Liste wie im Mail-Eingang
   * (PrueferMail) — eine zweite Liste liefe auseinander. Fehlt sie, steht das da. */
  var SEITEN_TEXT_MAX = 100, PFADE = { pdfjs: null, tesseract: null }, pdfjsVersprechen = null;
  function pfade(neu) { for (var k in neu || {}) PFADE[k] = neu[k]; return PFADE; }
  function pdfjsHolen() {
    if (welt.pdfjsLib) return Promise.resolve(welt.pdfjsLib);
    if (!PFADE.pdfjs || !welt.document) return Promise.reject(new Error("pdf.js ist nicht erreichbar"));
    if (pdfjsVersprechen) return pdfjsVersprechen;
    pdfjsVersprechen = new Promise(function (ok, nein) {
      var s = welt.document.createElement("script"), uhr = setTimeout(function () { nein(new Error("pdf.js kam nicht an")); }, 20000);
      s.src = PFADE.pdfjs + "pdf.min.js";
      s.onload = function () {
        clearTimeout(uhr);
        if (!welt.pdfjsLib) return nein(new Error("pdf.js meldet sich nicht"));
        welt.pdfjsLib.GlobalWorkerOptions.workerSrc = PFADE.pdfjs + "pdf.worker.min.js";
        ok(welt.pdfjsLib);
      };
      s.onerror = function () { clearTimeout(uhr); nein(new Error("pdf.js kam nicht an")); };
      welt.document.head.appendChild(s);
    });
    pdfjsVersprechen.catch(function () { pdfjsVersprechen = null; });   // ein späterer Versuch darf es neu holen
    return pdfjsVersprechen;
  }
  function pdfSeitentext(b) {
    return pdfjsHolen().then(function (L) {
      return L.getDocument({ data: b.slice(0), isEvalSupported: false }).promise;
    }).then(function (doc) {
      var n = Math.min(doc.numPages, SEITEN_TEXT_MAX), seiten = [], kette = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (nr) {
        kette = kette.then(function () { return doc.getPage(nr); }).then(function (pg) { return pg.getTextContent(); })
          .then(function (t) {
            var zeilen = [], z = "";
            t.items.forEach(function (it) { z += it.str; if (it.hasEOL) { zeilen.push(z); z = ""; } else if (it.str) z += " "; });
            if (z) zeilen.push(z);
            seiten.push({ seite: nr, text: zeilen.map(function (x) { return x.replace(/\s+/g, " ").trim(); }).filter(Boolean).join("\n") });
          });
      })(i);
      return kette.then(function () { return { seiten: seiten, alle: doc.numPages, doc: doc }; });
    });
  }
  /* ══ TEXT IM BILD — Stufe 2 A (2026-09-30)
   * Tesseract.js 7.0.0 liegt im eigenen Ordner der App (vendor/tesseract/, 21 MB,
   * nicht im Installations-Vorrat); die App setzt pfade({tesseract}). Gelesen
   * wird Deutsch, Englisch und Russisch in einem Durchgang.
   * ⚠ Gewählte Zahlen, nicht gemessen am Tablet:
   *   OCR_FRIST 90 s je Bild — das erste Bild trägt das Laden der Sprachdaten
   *   (9,5 MB) mit. OCR_SICHER 60 — Zeilen mit geringerer Sicherheit zählen
   *   nicht (Kanten und Muster eines Fotos liest Tesseract sonst als Buchstaben).
   *   OCR_SEITEN_MAX 10 PDF-Seiten ohne Textebene; dahinter wird benannt.
   *   OCR_KANTE 3000 px lange Kante; größere Bilder werden verkleinert gelesen. */
  var OCR_SPRACHEN = ["deu", "eng", "rus"], OCR_FRIST = 90000, OCR_SICHER = 60, OCR_SEITEN_MAX = 10, OCR_KANTE = 3000;
  var tessVersprechen = null;
  function absolut(u) { try { return welt.location ? new URL(u, welt.location.href).href : u; } catch (_e) { return u; } }
  function tesseractHolen() {
    if (tessVersprechen) return tessVersprechen;
    if (!welt.Tesseract && (!PFADE.tesseract || !welt.document)) return Promise.reject(new Error("die Texterkennung ist nicht erreichbar"));
    /* Unter file:// startet der Worker nicht, er HÄNGT bis zur Frist (gemessen
       2026-09-30). Dann lieber sofort und mit Grund. */
    if (!welt.Tesseract && welt.location && welt.location.protocol === "file:") return Promise.reject(new Error("die Texterkennung läuft nicht aus einer lokal geöffneten Datei (file://)"));
    var basis = PFADE.tesseract ? absolut(PFADE.tesseract) : "";
    tessVersprechen = (welt.Tesseract ? Promise.resolve(welt.Tesseract) : new Promise(function (ok, nein) {
      var s = welt.document.createElement("script"), uhr = setTimeout(function () { nein(new Error("die Texterkennung kam nicht an")); }, 30000);
      s.src = basis + "tesseract.min.js";
      s.onload = function () { clearTimeout(uhr); welt.Tesseract ? ok(welt.Tesseract) : nein(new Error("die Texterkennung meldet sich nicht")); };
      s.onerror = function () { clearTimeout(uhr); nein(new Error("die Texterkennung kam nicht an")); };
      welt.document.head.appendChild(s);
    })).then(function (T) {
      return T.createWorker(OCR_SPRACHEN, 1, { workerPath: basis + "worker.min.js", corePath: basis, langPath: basis + "lang",
        gzip: false, cacheMethod: "none" });
    });
    tessVersprechen.catch(function () { tessVersprechen = null; });   // ein späterer Versuch darf neu holen
    return tessVersprechen;
  }
  /* quelle: ein Canvas oder Bild-Bytes. Gibt {zeilen:[text], unsicher:n} zurück. */
  function bildLesen(quelle) {
    var uhr, frist = new Promise(function (_ok, nein) { uhr = setTimeout(function () { nein(new Error("Zeit abgelaufen (" + OCR_FRIST / 1000 + " s)")); }, OCR_FRIST); });
    var arbeit = tesseractHolen().then(function (w) {
      return w.recognize(quelle, {}, { blocks: true, text: false });
    }).then(function (r) {
      var zeilen = [], unsicher = 0;
      ((r && r.data && r.data.blocks) || []).forEach(function (bl) {
        (bl.paragraphs || []).forEach(function (pa) {
          (pa.lines || []).forEach(function (li) {
            var t = String(li.text || "").replace(/\s+/g, " ").trim();
            if (!t || !/[\p{L}\p{N}]/u.test(t)) return;
            if (!(li.confidence >= OCR_SICHER)) { unsicher++; return; }
            zeilen.push(t);
          });
        });
      });
      return { zeilen: zeilen, unsicher: unsicher };
    });
    return Promise.race([arbeit, frist]).then(function (x) { clearTimeout(uhr); return x; }, function (e) {
      clearTimeout(uhr);
      /* Ein hängender Leser darf das nächste Bild nicht mitnehmen. */
      if (/Zeit abgelaufen/.test(e && e.message) && tessVersprechen) {
        tessVersprechen.then(function (w) { try { w.terminate(); } catch (_e) {} }, function () {});
        tessVersprechen = null;
      }
      throw e;
    });
  }
  /* Bild-Bytes → Canvas (lange Kante höchstens OCR_KANTE). Ohne Browser: die Bytes selbst. */
  function bildQuelle(b, art) {
    if (!welt.document || !welt.createImageBitmap || !welt.Blob) return Promise.resolve(b);
    return welt.createImageBitmap(new welt.Blob([b], { type: "image/" + art })).then(function (bm) {
      var f = Math.min(1, OCR_KANTE / Math.max(bm.width, bm.height)), c = welt.document.createElement("canvas");
      c.width = Math.max(1, Math.round(bm.width * f)); c.height = Math.max(1, Math.round(bm.height * f));
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(bm, 0, 0, c.width, c.height); if (bm.close) bm.close();
      return c;
    }, function () { return b; });
  }
  /* Den gelesenen Text auf Anweisungen an eine KI prüfen — dieselbe Liste wie
     der Mail-Eingang. wo: "" beim Bild, "Seite n, " beim PDF. */
  function bildtextPruefen(text, wo, melde, hinweise) {
    var PM = welt.PrueferMail;
    if (!PM) { hinweise.push("Der Text im Bild wurde gelesen, aber die Liste der KI-Anweisungen (assets/pruefer-mail.js) ist nicht geladen — auf Anweisungen an eine KI ist er ungeprüft."); return; }
    PM.pruefeMail(text).stellen.forEach(function (st) {
      if (st.kennung !== "KI-ANWEISUNG") return;
      melde("BILD-KI-ANWEISUNG", st.satz + " (" + wo + "Bildtext Zeile " + st.zeile + ")");
    });
  }
  function bildTextPruefen(b, art, melde, hinweise, stand) {
    return bildQuelle(b, art).then(bildLesen).then(function (r) {
      if (!r.zeilen.length) {
        stand.bildUngeprueft = true;
        hinweise.push("Text im Bild ungeprüft: die Texterkennung fand keine sicher lesbare Zeile" +
          (r.unsicher ? " (" + r.unsicher + " unsichere verworfen)" : "") + ". Ein Bild ohne Text sieht genauso aus.");
        return null;
      }
      var text = r.zeilen.join("\n");
      hinweise.push("Text im Bild gelesen: " + r.zeilen.length + " Zeile(n)" + (r.unsicher ? ", " + r.unsicher + " unsichere verworfen" : "") + ".");
      bildtextPruefen(text, "", melde, hinweise);
      return text;
    }, function (e) {
      stand.bildUngeprueft = true;
      hinweise.push("Text im Bild ungeprüft: die Texterkennung lief nicht (" + ((e && e.message) || "unbekannt") + ").");
      return null;
    });
  }
  /* Eine PDF-Seite ohne Textebene zeichnen und lesen. */
  function seiteLesen(doc, nr) {
    return doc.getPage(nr).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 }), f = Math.min(2, OCR_KANTE / Math.max(v1.width, v1.height)), vp = pg.getViewport({ scale: f });
      var c = welt.document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      return pg.render({ canvasContext: g, viewport: vp }).promise.then(function () { return bildLesen(c); });
    });
  }
  function scanSeitenLesen(doc, leer, melde, hinweise, stand) {
    var liste = leer.slice(0, OCR_SEITEN_MAX), gelesen = [], kette = Promise.resolve(), abbruch = null;
    if (!welt.document) {
      stand.bildUngeprueft = true;
      hinweise.push(leer.length + " Seite(n) ohne Textebene (" + leer.slice(0, 8).join(", ") + (leer.length > 8 ? " …" : "") + ") — Text im Bild ungeprüft: die Texterkennung läuft nur im Browser.");
      return Promise.resolve(gelesen);
    }
    liste.forEach(function (nr) {
      kette = kette.then(function () {
        if (abbruch) return;
        return seiteLesen(doc, nr).then(function (r) {
          if (!r.zeilen.length) { stand.bildUngeprueft = true; hinweise.push("Seite " + nr + " ohne Textebene: Text im Bild ungeprüft — die Texterkennung fand keine sicher lesbare Zeile."); return; }
          var text = r.zeilen.join("\n");
          gelesen.push({ seite: nr, text: text, bild: true });
          hinweise.push("Seite " + nr + " ohne Textebene: Text im Bild gelesen, " + r.zeilen.length + " Zeile(n).");
          bildtextPruefen(text, "Seite " + nr + ", ", melde, hinweise);
        }, function (e) { abbruch = e; });
      });
    });
    return kette.then(function () {
      var rest = abbruch ? leer.filter(function (n) { return !gelesen.some(function (x) { return x.seite === n; }); }) : leer.slice(OCR_SEITEN_MAX);
      if (rest.length) stand.bildUngeprueft = true;
      if (abbruch) hinweise.push("Text im Bild ungeprüft auf Seite " + rest.slice(0, 8).join(", ") + (rest.length > 8 ? " …" : "") + ": die Texterkennung lief nicht (" + ((abbruch && abbruch.message) || "unbekannt") + ").");
      else if (rest.length) hinweise.push("Seiten ohne Textebene hinter den ersten " + OCR_SEITEN_MAX + " (" + rest.slice(0, 8).join(", ") + (rest.length > 8 ? " …" : "") + ") wurden NICHT gelesen — dort ist der Text im Bild ungeprüft.");
      return gelesen;
    });
  }
  function pdfTextPruefen(b, melde, hinweise, stand) {
    var frist = new Promise(function (_ok, nein) { setTimeout(function () { nein(new Error("Zeit abgelaufen")); }, 60000); });
    return Promise.race([pdfSeitentext(b), frist]).then(function (r) {
      var leer = r.seiten.filter(function (x) { return !x.text; }).map(function (x) { return x.seite; });
      var PM = welt.PrueferMail;
      if (!PM) hinweise.push("Der Seitentext wurde gelesen, aber die Liste der KI-Anweisungen (assets/pruefer-mail.js) ist nicht geladen — auf Anweisungen an eine KI ist er ungeprüft.");
      else r.seiten.forEach(function (x) {
        if (!x.text) return;
        PM.pruefeMail(x.text).stellen.forEach(function (st) {
          if (st.kennung !== "KI-ANWEISUNG") return;
          melde("PDF-KI-ANWEISUNG", st.satz + " (Seite " + x.seite + ", Zeile " + st.zeile + ")");
        });
      });
      hinweise.push("Seitentext gelesen: " + r.seiten.length + " von " + r.alle + " Seite(n).");
      if (r.alle > r.seiten.length) hinweise.push("Seiten " + (r.seiten.length + 1) + "–" + r.alle + " wurden NICHT gelesen (höchstens " + SEITEN_TEXT_MAX + ") — dort ungeprüft, nicht sauber.");
      var mitText = r.seiten.filter(function (x) { return x.text; });
      var fertig = function (x) { try { r.doc.destroy(); } catch (_e) {} return x; };
      if (!leer.length) return fertig(mitText);
      return scanSeitenLesen(r.doc, leer, melde, hinweise, stand).then(function (g) {
        return fertig(mitText.concat(g).sort(function (a, z) { return a.seite - z.seite; }));
      }, function () { return fertig(mitText); });
    }, function (e) {
      var grund = /password/i.test((e && (e.name + e.message)) || "") ? "das PDF ist mit einem Passwort geschützt" : (e && e.message) || "unbekannt";
      hinweise.push("Der Seitentext des PDFs wurde NICHT gelesen (" + grund + ") — er ist ungeprüft, nicht sauber.");
      return null;
    });
  }

  /* ══ DIE EINE TÜR
   * @returns Promise<{art, artName, befunde:[{kennung,satz}], text:string|null,
   *                   textQuelle:"bild"|null, seiten:[{seite,text,bild?}]|null,
   *                   hinweise:[], sicher:boolean, bildUngeprueft:boolean}>
   * bildUngeprueft: Text in einem Bild oder auf einer Scan-Seite wurde NICHT
   * gelesen — die App darf dann nicht „kein Befund" melden.
   * text: was Modul 25 danach lesen soll (null = kein Text gelesen).
   * seiten: beim PDF der Text je Seite, damit ein Fund seine Seite nennt. */
  function pruefe(name, bytes) {
    var b = alsBytes(bytes), art = artVon(b), befunde = [], hinweise = [], text = null, seiten = null, stand = { bildUngeprueft: false };
    function melde(k, satz) { befunde.push({ kennung: k, satz: satz }); }
    name = String(name || "");
    var endung = (/\.([A-Za-z0-9]{1,6})$/.exec(name) || [])[1];
    endung = endung ? endung.toLowerCase() : "";
    if (art === "programm" || PROGRAMM_ENDUNG.test(name))
      melde("ANHANG-PROGRAMM", "Das ist ein Programm oder Skript" + (art === "programm" ? " (am Dateikopf erkannt)" : " (Endung ." + endung + ")") + ". Programme gehören nicht in einen Mail-Anhang an eine KI.");
    var doppelt = /\.(pdf|jpe?g|png|docx?|xlsx?|txt)\.[a-z0-9]{2,4}$/i.exec(name);
    if (doppelt && PROGRAMM_ENDUNG.test(name)) melde("ANHANG-TARNUNG", "Der Name täuscht eine harmlose Datei vor (doppelte Endung).");
    else if (art === "programm" && endung && !PROGRAMM_ENDUNG.test(name)) melde("ANHANG-TARNUNG", "Die Endung „." + endung + "“ täuscht: die Datei ist in Wahrheit ein Programm.");
    else if (ENDUNGEN[art] && endung && ENDUNGEN[art].indexOf(endung) < 0)
      melde("ANHANG-TARNUNG", "Die Endung „." + endung + "“ passt nicht zum Inhalt: die Datei ist in Wahrheit ein " + ART_NAME[art] + ".");
    var weiter = Promise.resolve();
    if (art === "jpeg") anhaengsel(b, jpegPruefen(b, melde), melde);
    else if (art === "png") anhaengsel(b, pngPruefen(b, melde), melde);
    else if (art === "webp") anhaengsel(b, webpPruefen(b, melde), melde);
    else if (art === "gif") hinweise.push("Bei GIF wird nur der Dateikopf geprüft, nicht, was hinter dem Bild steht.");
    else if (art === "svg") text = svgPruefen(b, melde);
    else if (art === "text") text = new TextDecoder("utf-8").decode(b).replace(/^\uFEFF/, "");
    else if (art === "zip") weiter = officePruefen(b, name, melde).then(function (r) {
      art = r.art; text = r.text; if (r.hinweis) hinweise.push(r.hinweis);
    });
    else if (art === "pdf") {
      var PF = welt.PrueferFormate;
      if (!PF) hinweise.push("Der PDF-Prüfer (assets/pruefer-formate.js) ist nicht geladen — das PDF ist ungeprüft, nicht sauber.");
      else weiter = PF.pruefePdf(b, []).then(function (r) {
        r.stellen.forEach(function (x) { melde(x.kennung, x.satz + " (" + x.stelle + ")"); });
        hinweise.push.apply(hinweise, r.hinweise);
      });
      weiter = weiter.then(function () { return pdfTextPruefen(b, melde, hinweise, stand); }).then(function (s) {
        if (s && s.length) { seiten = s; text = s.map(function (x) { return x.text; }).join("\n"); }
      });
    }
    var textQuelle = null;
    if (/^(png|jpeg|webp|gif)$/.test(art)) weiter = weiter.then(function () {
      return bildTextPruefen(b, art, melde, hinweise, stand).then(function (t) { if (t) { text = t; textQuelle = "bild"; } });
    });
    return weiter.then(function () {
      return { art: art, artName: ART_NAME[art] || art, befunde: befunde, text: text, textQuelle: textQuelle, seiten: seiten, hinweise: hinweise,
        bildUngeprueft: stand.bildUngeprueft,
        sicher: /^(png|jpeg|webp|gif|svg)$/.test(art) };
    });
  }

  /* ══ ANHÄNGE AUS EINER MAIL — nur auspacken, nie ausführen. */
  var GROESSE_MAX = 25 * 1024 * 1024;
  function vonB64(s) {
    var t = String(s).replace(/[^A-Za-z0-9+/=]/g, ""), b;
    try { b = welt.atob ? welt.atob(t) : Buffer.from(t, "base64").toString("binary"); } catch (_e) { return new Uint8Array(0); }
    var u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  function vonQP(s, wort) {
    if (wort) s = s.replace(/_/g, " ");
    s = s.replace(/=\r?\n/g, "");
    var out = [], enc = new TextEncoder();
    for (var i = 0; i < s.length; i++) {
      if (s[i] === "=" && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else { var x = enc.encode(s[i]); for (var j = 0; j < x.length; j++) out.push(x[j]); }
    }
    return Uint8Array.from(out);
  }
  function dekod(b, cs) {
    try { return new TextDecoder(cs || "utf-8").decode(b); } catch (_e) { return new TextDecoder("utf-8").decode(b); }
  }
  function kopfWort(s) {
    return String(s || "").replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=(\s+(?==\?))?/g, function (_a, cs, art, t) {
      return dekod(/b/i.test(art) ? vonB64(t) : vonQP(t, true), cs);
    });
  }
  function kopfTeilen(roh) {
    var i = roh.search(/\r?\n\r?\n/);
    var kopf = (i < 0 ? roh : roh.slice(0, i)).replace(/\r?\n[ \t]+/g, " "), k = {};
    kopf.split(/\r?\n/).forEach(function (z) { var m = /^([A-Za-z\-]+):\s*(.*)$/.exec(z); if (m) k[m[1].toLowerCase()] = m[2]; });
    return { k: k, rumpf: i < 0 ? "" : roh.slice(i).replace(/^\r?\n\r?\n/, "") };
  }
  function dateiname(k) {
    var cd = k["content-disposition"] || "", ct = k["content-type"] || "";
    var m = /filename\*=(?:"?)([^";]+)/i.exec(cd);
    if (m) { var n = m[1].replace(/^[^']*'[^']*'/, ""); try { return decodeURIComponent(n); } catch (_e) { return n; } }
    m = /filename="?([^";]+)"?/i.exec(cd) || /name="?([^";]+)"?/i.exec(ct);
    return m ? kopfWort(m[1]) : null;
  }
  function ausMail(roh) {
    var aus = [], s = String(roh || "").replace(/^﻿/, "");
    (function teil(x, tiefe) {
      if (tiefe > 8) return;
      var ct = x.k["content-type"] || "", gr = /boundary="?([^";]+)"?/i.exec(ct);
      if (/^multipart\//i.test(ct) && gr) {
        x.rumpf.split("--" + gr[1]).slice(1).filter(function (t) { return !/^--/.test(t); }).forEach(function (t) {
          teil(kopfTeilen(t.replace(/^\r?\n/, "").replace(/\r?\n$/, "")), tiefe + 1);   // der Umbruch vor der Grenze gehört zur Grenze (RFC 2046)
        });
        return;
      }
      var name = dateiname(x.k);
      if (!name) return;
      var cte = (x.k["content-transfer-encoding"] || "").toLowerCase().trim(), typ = ct.split(";")[0].trim();
      var geschaetzt = cte === "base64" ? Math.floor(x.rumpf.replace(/\s/g, "").length * 3 / 4) : x.rumpf.length;
      if (geschaetzt > GROESSE_MAX) { aus.push({ name: name, typ: typ, groesse: geschaetzt, bytes: null, zuGross: true }); return; }
      var b = cte === "base64" ? vonB64(x.rumpf) : cte === "quoted-printable" ? vonQP(x.rumpf) : new TextEncoder().encode(x.rumpf);
      aus.push({ name: name, typ: typ, groesse: b.length, bytes: b, zuGross: false });
    })(kopfTeilen(s), 0);
    return aus;
  }

  var API = { pruefe: pruefe, artVon: artVon, zipEintraege: zipEintraege, ausMail: ausMail,
    BEFUNDE: BEFUNDE, gross: gross, GROESSE_MAX: GROESSE_MAX, pfade: pfade, SEITEN_TEXT_MAX: SEITEN_TEXT_MAX,
    OCR_SICHER: OCR_SICHER, OCR_SEITEN_MAX: OCR_SEITEN_MAX,
    /* nur für die Proben: die Frist kürzen, um das Hängen zu messen */
    ocrFrist: function (ms) { if (ms > 0) OCR_FRIST = ms; return OCR_FRIST; } };
  welt.PrueferAnhang = API;
  welt.SPAnhang = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);

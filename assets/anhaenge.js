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
 * ⚠ BENANNTE GRENZEN dieser Fassung: Text IN einem Bild (Texterkennung) und
 * der Seitentext eines PDFs werden NICHT gelesen. An die KI geht weiterhin
 * nur der Mailtext, keine Datei.
 *
 * ⚠ DIE SEITE BLEIBT UNBERÜHRT. Sie ist voll (96 KB für vier Dateien); diese
 * Datei hängt sich über einen Beobachter in die Leseansicht und liest die
 * Mail über die globalen Namen des Seiten-Skripts (aktuell, jetztSpeichern,
 * finde, mailNamen). Fehlt diese Datei, läuft die Seite wie vorher.
 *
 * Die Prüfung (pruefe) läuft in beiden Welten, Browser und Node, damit die
 * Probe genau den Code misst, den der Browser ausführt. PDF-Befunde kommen
 * aus assets/pruefer-formate.js — byte-1:1 aus dem Auslieferungsprüfer,
 * dort pflegen, hier neu kopieren.
 */
(function (welt) {
  "use strict";

  var BEFUNDE = ["ANHANG-TARNUNG", "ANHANG-PROGRAMM", "BILD-ANHAENGSEL", "BILD-METADATEN",
    "SVG-SKRIPT", "SVG-VERWEIS", "OFFICE-MAKRO", "OFFICE-VERWEIS", "OFFICE-EINBETTUNG",
    "PDF-VERWEIS", "PDF-AKTION", "PDF-ANHANG", "PDF-METADATEN", "PDF-ALTFASSUNG"];

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
    return "unbekannt";
  }
  var ART_NAME = { png: "PNG-Bild", jpeg: "JPEG-Bild", gif: "GIF-Bild", webp: "WebP-Bild", pdf: "PDF",
    zip: "ZIP-Archiv", docx: "Word-Dokument", xlsx: "Excel-Tabelle", pptx: "PowerPoint", svg: "SVG-Grafik",
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

  /* ══ DIE EINE TÜR
   * @returns Promise<{art, artName, befunde:[{kennung,satz}], text:string|null,
   *                   hinweise:[], sicher:boolean}>
   * text: was Modul 25 danach lesen soll (null = kein Text gelesen). */
  function pruefe(name, bytes) {
    var b = alsBytes(bytes), art = artVon(b), befunde = [], hinweise = [], text = null;
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
      hinweise.push("Der Seitentext eines PDFs wird in dieser Fassung nicht gelesen.");
    }
    if (/^(png|jpeg|webp|gif)$/.test(art)) hinweise.push("Text im Bild (Texterkennung) wird in dieser Fassung nicht gelesen.");
    return weiter.then(function () {
      return { art: art, artName: ART_NAME[art] || art, befunde: befunde, text: text, hinweise: hinweise,
        sicher: /^(png|jpeg|webp|gif|svg)$/.test(art) };
    });
  }

  var API = { pruefe: pruefe, artVon: artVon, zipEintraege: zipEintraege, BEFUNDE: BEFUNDE, gross: gross };
  welt.SPAnhang = API;
  if (typeof document === "undefined") return;

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

  function zeile(m, a) {
    var li = el("li", { class: "anhang", "data-anhang": a.id },
      el("div", { class: "anhang-kopf" }, el("b", { class: "anhang-name" }, a.name),
        el("span", { class: "gedaempft", "data-anhang-art": "" }, " · " + gross(a.groesse || 0) + " · wird geprüft …")));
    var liste = el("ul", { class: "befunde anhang-befunde" }), fuss = el("div", { class: "werkzeug", style: "margin:6px 0 0" }),
      meldung = el("p", { class: "meldung", "data-anhang-meldung": "" });
    li.append(liste, fuss, meldung);
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
      if (!r.befunde.length && !funde.length) liste.append(el("li", { "data-kennung": "OHNE" }, "Nichts gefunden von dem, wonach gesucht wird."));
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
    fuss.append(el("button", { class: "knopf", type: "button", "data-weg": "", onclick: function () {
      m.anhaenge = (m.anhaenge || []).filter(function (x) { return x.id !== a.id; }); ergebnisse.delete(a.id); speichern(m); zeichne();
    } }, "Entfernen"));
    return li;
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
      el("div", { class: "werkzeug", style: "margin:8px 0 0" }, el("label", { class: "knopf", for: "anhang-datei" }, "📎 Anhang hinzufügen"), eingabe),
      el("p", { class: "gedaempft", "data-anhang-grenze": "" }, "Grenze: kein Virenscanner und keine Suche nach Botschaften, die in Bildpunkten versteckt sind. Text in Bildern und der Seitentext von PDFs werden noch nicht gelesen. An die KI geht nur der Mailtext, keine Datei."));
  }

  function zeichne() {
    var box = document.getElementById("lesen"), aktuell = g("aktuell");
    if (!box || !aktuell) return;
    var m = aktuell(), alt = document.getElementById("anhaenge");
    if (!m) { if (alt) alt.remove(); return; }
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

  function start() {
    document.head.append(el("style", null, ".anhang-liste{list-style:none;padding:0;margin:8px 0}.anhang{border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);padding:8px 0}.anhang-name{overflow-wrap:anywhere}.anhang-befunde{margin:6px 0 0}"));
    if (!welt.PrueferFormate) {
      var s = document.createElement("script"); s.src = "assets/pruefer-formate.js"; document.head.append(s);
    }
    beobachten();
  }
  /* SOFORT, nicht erst nach dem Laden: das Seiten-Skript leert das Feld in
     SEINEM change-Zuhörer — wer danach kommt, findet keine Datei mehr. */
  emlBeobachten();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(typeof window !== "undefined" ? window : globalThis);

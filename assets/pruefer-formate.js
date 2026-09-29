/* Auslieferungsprüfer — die Eingänge NEBEN der HTML-Seite.
 *
 * WARUM ES DIESE DATEI GIBT. Am 2026-08-22 lagen 75 Rechnungen als JSON unter
 * einer öffentlichen Adresse, obwohl das Depot privat stand. Der Prüfer hätte
 * sie durchgewinkt: er ist ein HTML-Leser, und auf einer JSON-Datei feuert kein
 * einziges Tag. Einziger Fund wäre gewesen „keine Sprache angegeben" — also
 * eine Meldung, die vom eigentlichen Schaden ablenkt.
 *
 * ⚠ `pruefer.js` WIRD DABEI NICHT ANGEFASST. Dessen `pruefe()` steht unter der
 * Zusicherung „zwei Fassungen, ein Ergebnis": `tests/smoke_pruefer.mjs`
 * vergleicht jede Meldung Zeichen für Zeichen gegen die Python-Fassung in
 * Kimhub. Was hier dazukommt, kommt DANEBEN — ein neuer Eingang, kein Eingriff
 * in den alten. Die Textmuster unten sind in der Python-Fassung wortgleich
 * nachgezogen und werden ebenso gegeneinander geprüft.
 *
 * Läuft in beiden Welten (Browser und Node), wie die SBKIM-Module — damit die
 * Probe genau den Code prüft, den der Besucher ausführt.
 */
(function (welt) {
  "use strict";

  var BEFUNDE_TEXT = ["SCHLUESSEL", "PERSONENBEZUG", "RECHNUNGSDATEN",
                      "FREMDE-ADRESSE", "FUELLTEXT"];
  var BEFUNDE_PDF  = ["PDF-VERWEIS", "PDF-AKTION", "PDF-ANHANG",
                      "PDF-METADATEN", "PDF-ALTFASSUNG"];

  /* ══ FREIGESTELLTE PFADE ══════════════════════════════════════════════════
   * Neunzehn von Klaus' Seiten tragen ein Impressum mit echter Anschrift und
   * echter Mailadresse. Die MÜSSEN dort stehen (§ 5 DDG). Ein Prüfer, der bei
   * jedem Lauf Alarm schlägt, wird abgeschaltet — und dann meldet er auch den
   * echten Fund nicht mehr.
   *
   * ⚠ FREIGESTELLT WIRD DER PFAD, NIE DER WERT. Würde man den Wert freistellen
   * („diese Mailadresse ist in Ordnung"), schwiege dieselbe Adresse auch dort,
   * wo sie versehentlich steht — in einer Konfigurationsdatei, in einem
   * Protokoll, in einem Datenauszug. Genau die ist der echte Fund.
   */
  var FREI_PFADE = ["impressum.html", "datenschutz.html", "rechte.md",
                    "impressum.md", "datenschutz.md", "license", "licence"];

  function istFreigestellt(pfad) {
    var p = String(pfad || "").toLowerCase().replace(/\\/g, "/");
    var name = p.split("/").pop();
    for (var i = 0; i < FREI_PFADE.length; i++) {
      if (name === FREI_PFADE[i] || name.indexOf(FREI_PFADE[i]) === 0) return true;
    }
    return false;
  }

  /* ══ DIE MUSTER ═══════════════════════════════════════════════════════════
   * Jedes Muster ist so eng gefasst, wie es sein kann, ohne den Fall zu
   * verlieren. Der Grund steht in jeder zweiten Tafel dieses Netzes: eine
   * Warnung, die man nicht mehr los wird, ist keine Warnung. Ein Prüfer, der
   * auf jeder Datei etwas meldet, wird weggeklickt — und dann sieht niemand
   * mehr den einen Fund, auf den es ankam.
   *
   * Deshalb steht bei den Schlüsseln überall eine MINDESTLÄNGE: `sk-` allein
   * kommt in gewöhnlichem Text vor, `sk-` plus zwanzig Zeichen aus dem
   * Schlüssel-Alphabet nicht.
   */
  var MUSTER = [
    /* -- Schlüssel und Zugangsdaten ------------------------------------- */
    { k: "SCHLUESSEL", was: "ein Anthropic-Schlüssel",
      re: /sk-ant-[A-Za-z0-9_\-]{16,}/ },
    { k: "SCHLUESSEL", was: "ein OpenAI-Schlüssel",
      re: /\bsk-(?!ant-)[A-Za-z0-9_\-]{20,}/ },
    { k: "SCHLUESSEL", was: "ein GitHub-Token",
      re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/ },
    { k: "SCHLUESSEL", was: "ein GitHub-Token (neue Form)",
      re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
    { k: "SCHLUESSEL", was: "ein Google-API-Schlüssel",
      re: /\bAIza[A-Za-z0-9_\-]{30,}/ },
    { k: "SCHLUESSEL", was: "ein Amazon-Zugangsschlüssel",
      re: /\bAKIA[0-9A-Z]{16}\b/ },
    { k: "SCHLUESSEL", was: "ein Slack-Token",
      re: /\bxox[baprs]-[A-Za-z0-9\-]{10,}/ },
    /* Klaus' eigenes Netz: der private Nostr-Schlüssel der Pinnwand. Wer den
       veröffentlicht, gibt seine Identität am Brett aus der Hand. */
    { k: "SCHLUESSEL", was: "ein privater Nostr-Schlüssel (nsec)",
      re: /\bnsec1[02-9ac-hj-np-z]{50,}/ },
    { k: "SCHLUESSEL", was: "ein privater Schlüssel im Klartext",
      re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
    /* ⚠ DAS SCHLIESSENDE ANFÜHRUNGSZEICHEN MUSS MIT. In JSON heisst das Feld
       `"api_key":` — mit Zeichen VOR dem Doppelpunkt. Die erste Fassung suchte
       `api_key` gefolgt von `:` und traf deshalb in einer JSON-Datei nie, also
       genau dort, wo Schlüssel am häufigsten liegen. Gemessen an einer
       Probedatei: 0 Treffer, obwohl der Schlüssel dastand. */
    { k: "SCHLUESSEL", was: "ein Feld, das einen Schlüssel trägt",
      re: /\b(?:api[_\-]?key|apikey|secret|client[_\-]?secret|passwort|password|passwd)\b["']?\s*[:=]\s*["']?[^\s"',}]{12,}/i },
    { k: "SCHLUESSEL", was: "ein Bearer-Token in einem Kopf",
      re: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]{16,}/i },

    /* -- Personenbezug --------------------------------------------------- */
    /* ⚠ DIE GRENZEN SIND KEINE ZIERDE — OHNE SIE FRIERT DIE SEITE EIN.
       Gemessen am 2026-09-09 an einer EINZIGEN langen Zeile (und genau so
       kommt HTML-Post an: der ganze Rumpf steht oft in einer Zeile):

         60 000 Zeichen   ·  unbegrenzt 2 174 ms  ·  begrenzt 0 ms
        100 000 Zeichen   ·  die ganze Prüfung 5 787 ms
        200 000 Zeichen   ·  die ganze Prüfung 23 211 ms

       Die Ursache ist das unbegrenzte `+` vor dem `@`: an JEDER Stelle frisst
       es bis zum Zeilenende, findet kein `@` und geht Zeichen für Zeichen
       zurück — das ist quadratisch. Alle übrigen Muster dieser Datei wurden
       einzeln nachgemessen und liegen bei 0 ms; es war dieses eine.

       Die Grenzen sind zugleich die richtige Angabe: RFC 5321 lässt vor dem @
       höchstens 64 Zeichen zu und dahinter 255. Am Ergebnis ändert sich
       dadurch nichts — eine Adresse, die diese Grenzen sprengt, wird weiterhin
       gemeldet, nur ohne den Rückwärtsgang.

       ⚠ DIE PYTHON-FASSUNG HAT DENSELBEN FEHLER (`pruefe-datei.py`, Zeile 88).
       Nachgemessen: 3 454 ms → 9 ms mit derselben Änderung. Sie ist HIER nicht
       mitgezogen, weil sie in einem anderen Depot liegt — das steht im Brief
       und im PR-Text, damit es nicht verlorengeht. Die Zusicherung „zwei
       Fassungen, ein Ergebnis" bleibt unberührt: die Ergebnisse sind gleich,
       nur die Laufzeit ist es nicht. */
    { k: "PERSONENBEZUG", was: "eine Mailadresse",
      re: /[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,255}\.[A-Za-z]{2,}/ },
    /* ⚠ NUR MIT LÄNDERVORWAHL ODER tel:. Eine blosse Ziffernfolge als
       Telefonnummer zu lesen, meldet jede Kennung und jeden Zeitstempel in
       einer JSON-Datei — gemessen an Klaus' eigenen Daten wäre das der lauteste
       Fehlalarm von allen. Lieber eine Nummer ohne Vorwahl übersehen als jede
       Datei mit Zahlen anklagen. */
    { k: "PERSONENBEZUG", was: "eine Telefonnummer",
      re: /(?:tel:|\+\d{2}[\s\-/()]?)\d[\d\s\-/()]{6,}\d/ }
  ];

  /* Die IBAN bekommt eine eigene Prüfung statt eines Musters: die Form allein
     (zwei Buchstaben, zwei Ziffern, dann Zeichen) trifft auch Bestellnummern
     und Kennungen. Mit der Prüfziffer nach ISO 7064 bleibt fast nur eine echte
     IBAN übrig — dieselbe Rechnung, die auch die Bank macht. Ein Muster ohne
     diese Rechnung wäre ein Fehlalarm-Werk. */
  function istIban(roh) {
    var s = String(roh).replace(/[\s\-]/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    var um = s.slice(4) + s.slice(0, 4), rest = 0;
    for (var i = 0; i < um.length; i++) {
      var c = um.charCodeAt(i);
      var teil = (c >= 65 && c <= 90) ? String(c - 55) : um.charAt(i);
      for (var j = 0; j < teil.length; j++) rest = (rest * 10 + (teil.charCodeAt(j) - 48)) % 97;
    }
    return rest === 1;
  }
  var IBAN_FORM = /\b[A-Z]{2}\d{2}(?:[ \-]?[A-Z0-9]{2,4}){3,8}\b/g;

  /* Rechnungsdaten. Der Fall, um den es geht: eine Sammlung von Belegen, die
     niemand ins Depot legen wollte. Ein einzelner Betrag auf einer Seite ist
     kein Befund — ein FELD, das Beträge oder Belegnummern trägt, schon. */
  var GELD_FELD = /"(?:betrag|amount|total|summe|netto|brutto|preis|price|ust|mwst|steuer|tax)"\s*:/i;
  var BELEG_FELD = /"(?:rechnung|rechnungsnummer|invoice|invoice_id|beleg|belegnummer|receipt|receipt_number|kundennummer|customer_id)[a-z_]*"\s*:/i;
  var GELD_WERT = /\d+[.,]\d{2}\s?(?:€|EUR|\$|USD|CHF)\b|\b(?:EUR|USD|CHF)\s?\d+[.,]\d{2}/;

  function maskiere(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Fremde Adressen in einer Textdatei. In HTML hängt eine Adresse an einem
     Attribut; hier steht sie nackt. Gemeldet wird nur, was wirklich holt —
     `http(s)://` —, nicht jedes Wort mit einem Punkt darin. */
  var ADRESSE = /\bhttps?:\/\/([A-Za-z0-9._\-]+(?::\d+)?)/g;

  /* Fülltext: dieselbe Liste wie in der HTML-Fassung, damit ein „TODO" in einer
     README genauso auffällt wie eines in der Seite. Eine zweite, eigene Liste
     wäre eine Drift-Quelle mit Ansage. */
  function fuellwoerter() {
    var p = welt.Auslieferungspruefer;
    return (p && p.FUELLWOERTER) ? p.FUELLWOERTER : [];
  }

  /**
   * Prüft eine Text-, JSON-, Markdown- oder Konfigurationsdatei.
   * @param {string} text  der Inhalt
   * @param {string} pfad  der Dateiname — entscheidet über die Freistellung
   * @param {string[]} erlaubt  Wirte, die nicht als fremd gelten
   * @returns {{zeile:number, kennung:string, satz:string}[]} nach Zeile sortiert
   */
  function pruefeText(text, pfad, erlaubt) {
    text = String(text == null ? "" : text);
    erlaubt = (erlaubt || []).map(function (e) { return String(e).toLowerCase().trim(); })
                             .filter(Boolean);
    var frei = istFreigestellt(pfad);
    var treffer = [];
    var zeilen = text.split("\n");

    var fuell = fuellwoerter().map(function (w) {
      return { wort: w, muster: new RegExp("(?:^|[^A-Za-z0-9_])" + maskiere(w) + "(?![A-Za-z0-9_])", "i") };
    });

    for (var z = 0; z < zeilen.length; z++) {
      var zeile = zeilen[z], nr = z + 1;

      for (var m = 0; m < MUSTER.length; m++) {
        var mu = MUSTER[m];
        /* ⚠ NUR DER PERSONENBEZUG WIRD FREIGESTELLT, NIE EIN SCHLÜSSEL.
           In einem Impressum gehört eine Anschrift; ein Zugangsschlüssel
           gehört dort so wenig hin wie anderswo. Eine Freistellung, die auch
           Schlüssel mitnimmt, wäre eine Hintertür mit Dateinamen. */
        if (frei && mu.k === "PERSONENBEZUG") continue;
        if (mu.re.test(zeile)) {
          treffer.push({ zeile: nr, kennung: mu.k, satz: "Gefunden: " + mu.was + "." });
        }
      }

      if (!frei) {
        IBAN_FORM.lastIndex = 0;
        var im;
        while ((im = IBAN_FORM.exec(zeile)) !== null) {
          if (istIban(im[0])) {
            treffer.push({ zeile: nr, kennung: "PERSONENBEZUG",
                           satz: "Gefunden: eine Kontonummer (IBAN, Prüfziffer stimmt)." });
            break;
          }
        }
      }

      if (GELD_FELD.test(zeile) || BELEG_FELD.test(zeile) || GELD_WERT.test(zeile)) {
        treffer.push({ zeile: nr, kennung: "RECHNUNGSDATEN",
                       satz: "Gefunden: ein Feld oder Betrag aus einer Abrechnung." });
      }

      ADRESSE.lastIndex = 0;
      var am, gemeldet = {};
      while ((am = ADRESSE.exec(zeile)) !== null) {
        var wirt = am[1].toLowerCase().split(":")[0];
        if (gemeldet[wirt]) continue;
        var eigen = false;
        for (var e = 0; e < erlaubt.length; e++) {
          if (wirt === erlaubt[e] || wirt.slice(-(erlaubt[e].length + 1)) === "." + erlaubt[e]) eigen = true;
        }
        if (eigen) continue;
        gemeldet[wirt] = 1;
        treffer.push({ zeile: nr, kennung: "FREMDE-ADRESSE",
                       satz: "Adresse eines fremden Rechners: " + wirt });
      }

      for (var f = 0; f < fuell.length; f++) {
        if (fuell[f].muster.test(zeile)) {
          treffer.push({ zeile: nr, kennung: "FUELLTEXT",
                         satz: "Rest aus dem Bau: '" + fuell[f].wort + "'" });
        }
      }
    }

    treffer.sort(function (x, y) {
      return x.zeile - y.zeile || (x.kennung < y.kennung ? -1 : x.kennung > y.kennung ? 1 : 0);
    });
    return treffer;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * PDF
   *
   * ⚠ SELBST GEBAUT, KEIN pdf.js. Ein Megabyte aus dem Netz bräche die
   * Offline-Zusage, mit der diese Seite wirbt — und für das, was hier gesucht
   * wird, braucht es keinen vollständigen Leser: es sind Strukturen, keine
   * Seiteninhalte.
   *
   * ⚠ UND DER TEXT IM DOKUMENT WIRD NICHT GEDEUTET. Das ist eine bewusste
   * Grenze, keine Bequemlichkeit. Ein Textauszug aus einem PDF ist ein eigenes
   * Werkzeug (Schriftarten-Tabellen, Zeichen-Abbildungen, Satz-Reihenfolge) und
   * liefert am Ende einen Text, dem man nicht ansieht, wie zuverlässig er ist.
   * Ein Fund, dem man nicht trauen kann, ist schlimmer als kein Fund.
   *
   * ⚠ EIN PDF HAT KEINE ZEILEN, die einem Menschen etwas sagen. Die Stelle
   * heisst deshalb OBJEKT (die Nummer, unter der das PDF selbst sie führt) und
   * nicht Zeile. Das steht an jedem Fund dran, statt eine Genauigkeit
   * vorzutäuschen, die es nicht gibt.
   */

  function alsLatin1(bytes) {
    var s = "", h = 32768;
    for (var i = 0; i < bytes.length; i += h) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + h, bytes.length)));
    }
    return s;
  }

  /* Objektnummer zu einer Stelle: das letzte `N 0 obj` davor. Ohne das hiesse
     jeder Fund „irgendwo in der Datei", und damit fängt niemand etwas an. */
  function objektVor(roh, pos) {
    var bis = roh.lastIndexOf(" obj", pos);
    if (bis === -1) return null;
    var anf = Math.max(0, bis - 24);
    var m = /(\d+)\s+(\d+)\s+obj$/.exec(roh.slice(anf, bis + 4));
    return m ? m[1] : null;
  }

  /* ⚠ DAS ZEILENENDE VOR `endstream` GEHÖRT NICHT ZUM STROM. Der PDF-Standard
     verlangt dort ein Zeilenende, das ausdrücklich KEINE Nutzlast ist. Wer es
     mitgibt, bekommt „trailing junk after the end of the compressed stream" —
     an einer Probedatei gemessen: der einzige gepackte Strom galt als nicht
     lesbar, und die Metadaten darin blieben unentdeckt. Ein Strom, der nur
     wegen eines Zeilenumbruchs als unlesbar zählt, versteckt genau das, wofür
     das Öffnen gebaut wurde. */
  function ohneEndzeile(bytes) {
    var bis = bytes.length;
    while (bis > 0 && (bytes[bis - 1] === 10 || bytes[bis - 1] === 13)) bis--;
    return bytes.subarray(0, bis);
  }

  function entpacke(roheBytes) {
    /* Zwei Welten, ein Ergebnis. Im Browser bringt die Plattform es mit; unter
       Node liegt dasselbe in `zlib`. Geht es schief, wird der Strom
       übersprungen und NICHT als sauber gemeldet — die Zusammenfassung sagt,
       wie viele nicht lesbar waren. */
    var bytes = ohneEndzeile(roheBytes);
    if (typeof welt.DecompressionStream === "function") {
      return Promise.resolve().then(function () {
        var ds = new welt.DecompressionStream("deflate");
        var w = ds.writable.getWriter();
        w.write(bytes); w.close();
        return new Response(ds.readable).arrayBuffer();
      }).then(function (b) { return new Uint8Array(b); }, function () { return null; });
    }
    /* ⚠ ÜBER EIN VERSPRECHEN, NICHT ÜBER try/catch. `inflateSync` meldet einen
       kaputten Strom in Node 22 aus einem Rückruf heraus — die Ausnahme fliegt
       AN try/catch VORBEI und riss den ganzen Lauf mit („uncaught exception
       from promise"). Gemessen, nicht vermutet. */
    return Promise.resolve().then(function () {
      var zlib = welt.__pruefer_zlib;
      if (!zlib) return null;
      return new Uint8Array(zlib.inflateSync(Buffer.from(bytes)));
    }).then(null, function () { return null; });
  }

  var PDF_AKTIONEN = [
    { re: /\/JavaScript\b/,  was: "eingebettetes JavaScript" },
    { re: /\/JS\b/,          was: "eingebettetes JavaScript (/JS)" },
    { re: /\/Launch\b/,      was: "eine Aktion, die ein Programm startet" },
    { re: /\/SubmitForm\b/,  was: "ein Formular, das Eingaben verschickt" },
    { re: /\/OpenAction\b/,  was: "eine Aktion, die beim Öffnen von allein läuft" },
    { re: /\/AA\b/,          was: "eine Aktion, die an ein Ereignis hängt" },
    { re: /\/RichMedia\b/,   was: "eingebettete Medien mit eigener Abspiel-Logik" },
    { re: /\/GoToR\b/,       was: "ein Sprung in eine andere Datei" }
  ];

  var PDF_METAFELDER = ["Author", "Creator", "Producer", "Title", "Subject", "Keywords"];

  /**
   * Prüft eine PDF-Datei.
   * @param {Uint8Array} bytes  die Datei
   * @param {string[]} erlaubt  Wirte, die nicht als fremd gelten
   * @returns {Promise<{stellen:object[], hinweise:string[]}>}
   */
  function pruefePdf(bytes, erlaubt) {
    erlaubt = (erlaubt || []).map(function (e) { return String(e).toLowerCase().trim(); })
                             .filter(Boolean);
    bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    var roh = alsLatin1(bytes);
    var treffer = [], hinweise = [];

    if (roh.slice(0, 5) !== "%PDF-") {
      return Promise.resolve({
        stellen: [],
        hinweise: ["Das ist keine PDF-Datei — sie beginnt nicht mit %PDF-."]
      });
    }
    hinweise.push("PDF-Fassung " + (/^%PDF-(\d+\.\d+)/.exec(roh) || [, "?"])[1] +
                  ", " + bytes.length + " Bytes.");

    function melde(pos, kennung, satz) {
      var obj = objektVor(roh, pos);
      treffer.push({ stelle: obj ? "Objekt " + obj : "Byte " + pos,
                     kennung: kennung, satz: satz });
    }

    /* -- Verweise nach außen --------------------------------------------- */
    var ure = /\/URI\s*\(\s*([^)]{1,400})\)/g, um;
    var wirteGesehen = {};
    while ((um = ure.exec(roh)) !== null) {
      var adr = um[1].replace(/\\([()\\])/g, "$1").trim();
      var wm = /^(?:https?:)?\/\/([A-Za-z0-9._\-]+)/.exec(adr);
      if (!wm) continue;
      var wirt = wm[1].toLowerCase(), eigen = false;
      for (var e = 0; e < erlaubt.length; e++) {
        if (wirt === erlaubt[e] || wirt.slice(-(erlaubt[e].length + 1)) === "." + erlaubt[e]) eigen = true;
      }
      if (eigen || wirteGesehen[wirt]) continue;
      wirteGesehen[wirt] = 1;
      melde(um.index, "PDF-VERWEIS", "Verweis auf einen fremden Rechner: " + wirt);
    }

    /* -- Aktionen --------------------------------------------------------- */
    function aktionenIn(text, versatz, herkunft) {
      for (var a = 0; a < PDF_AKTIONEN.length; a++) {
        var m = PDF_AKTIONEN[a].re.exec(text);
        if (!m) continue;
        melde(versatz + m.index, "PDF-AKTION",
              "Das Dokument enthält " + PDF_AKTIONEN[a].was + herkunft + ".");
      }
    }
    aktionenIn(roh, 0, "");

    /* -- Anhänge ---------------------------------------------------------- */
    if (/\/EmbeddedFile\b|\/FileAttachment\b|\/Filespec\b/.test(roh)) {
      var ap = roh.search(/\/EmbeddedFile\b|\/FileAttachment\b|\/Filespec\b/);
      var namen = [], nre = /\/(?:UF|F)\s*\(([^)]{1,200})\)/g, nm, zaehler = 0;
      while ((nm = nre.exec(roh)) !== null && zaehler < 6) { namen.push(nm[1]); zaehler++; }
      melde(ap, "PDF-ANHANG", "An der Datei hängt eine weitere Datei" +
            (namen.length ? " (" + namen.join(", ") + ")" : "") +
            " — sie wird mit ausgeliefert, ohne im Dokument sichtbar zu sein.");
    }

    /* -- Metadaten -------------------------------------------------------- */
    function metaIn(text, versatz, herkunft) {
      for (var i = 0; i < PDF_METAFELDER.length; i++) {
        var feld = PDF_METAFELDER[i];
        var re = new RegExp("/" + feld + "\\s*\\(([^)]{1,300})\\)", "g"), m;
        while ((m = re.exec(text)) !== null) {
          var wert = m[1].replace(/\\([()\\])/g, "$1").trim();
          if (!wert) continue;
          melde(versatz + m.index, "PDF-METADATEN",
                feld + ": " + (wert.length > 120 ? wert.slice(0, 120) + " …" : wert) + herkunft);
          break;
        }
      }
      /* XMP — dieselbe Auskunft in einer zweiten Sprache, und oft die
         gesprächigere: dort steht das Programm samt Fassung und die Uhrzeit. */
      var xre = /<(dc:creator|xmp:CreatorTool|pdf:Producer|xmp:CreateDate)[^>]*>([\s\S]{1,300}?)<\/\1>/g, xm;
      while ((xm = xre.exec(text)) !== null) {
        var inhalt = xm[2].replace(/<[^>]*>/g, "").trim();
        if (!inhalt) continue;
        melde(versatz + xm.index, "PDF-METADATEN",
              xm[1] + ": " + (inhalt.length > 120 ? inhalt.slice(0, 120) + " …" : inhalt) + herkunft);
      }
    }
    metaIn(roh, 0, "");

    /* -- Frühere Fassungen -------------------------------------------------
     * Der beste Fund, den ein PDF hergibt, und der am wenigsten bekannte:
     * Bearbeitungs-Programme hängen Änderungen HINTEN AN, statt die Datei neu
     * zu schreiben. Wer einen Absatz gelöscht, einen Preis geändert oder etwas
     * geschwärzt und dann gespeichert hat, liefert die alte Fassung mit — sie
     * steht weiter in der Datei und ist mit jedem Betrachter wieder sichtbar
     * zu machen. Erkennbar an mehr als einem `%%EOF`. */
    var eofs = (roh.match(/%%EOF/g) || []).length;
    if (eofs > 1) {
      treffer.push({ stelle: eofs + "-mal %%EOF", kennung: "PDF-ALTFASSUNG",
        satz: "Die Datei enthält " + eofs + " Speicherstände. Alles, was vor dem " +
              "letzten stand, steckt weiter darin — auch Gelöschtes und Geschwärztes." });
    }

    if (/\/Encrypt\b/.test(roh)) {
      hinweise.push("Die Datei ist verschlüsselt oder mit Rechten versehen. " +
                    "Was in den verschlüsselten Teilen steht, ist hier NICHT geprüft.");
    }

    /* -- Ströme öffnen -----------------------------------------------------
     * Seit PDF 1.5 stecken ganze Objekte in gepackten Strömen (`/ObjStm`) —
     * darunter die Metadaten. Ein Leser, der nur den Klartext ansieht, meldet
     * dort NICHTS und sieht dabei aus, als sei die Datei sauber. */
    var stroeme = [], sre = /stream\r?\n?/g, sm;
    while ((sm = sre.exec(roh)) !== null) {
      var beginn = sm.index + sm[0].length;
      var ende = roh.indexOf("endstream", beginn);
      if (ende === -1) continue;
      var kopf = roh.slice(Math.max(0, sm.index - 400), sm.index);
      if (!/\/FlateDecode/.test(kopf)) { sre.lastIndex = ende; continue; }
      stroeme.push({ von: beginn, bis: ende });
      sre.lastIndex = ende;
      if (stroeme.length >= 60) break;
    }

    var nichtLesbar = 0;
    return stroeme.reduce(function (kette, s) {
      return kette.then(function () {
        return entpacke(bytes.subarray(s.von, s.bis)).then(function (aus) {
          if (!aus) { nichtLesbar++; return; }
          var text = alsLatin1(aus);
          metaIn(text, s.von, " (in einem gepackten Strom)");
          aktionenIn(text, s.von, " (in einem gepackten Strom)");
        }, function () { nichtLesbar++; });
      });
    }, Promise.resolve()).then(function () {
      if (stroeme.length) {
        hinweise.push(stroeme.length + " gepackte Ströme geöffnet" +
          (nichtLesbar ? ", " + nichtLesbar + " davon NICHT lesbar — die sind ungeprüft, nicht sauber" : "") + ".");
      }
      /* Doppelte Meldungen zusammenfassen: derselbe Befund kann im Klartext UND
         im gepackten Strom stehen. Zweimal dasselbe zu melden lässt eine Datei
         schlimmer aussehen, als sie ist. */
      var gesehen = {}, sauber = [];
      treffer.forEach(function (x) {
        var s = x.kennung + "|" + x.satz.replace(" (in einem gepackten Strom)", "");
        if (gesehen[s]) return;
        gesehen[s] = 1; sauber.push(x);
      });
      return { stellen: sauber, hinweise: hinweise };
    });
  }

  welt.PrueferFormate = {
    pruefeText: pruefeText,
    pruefePdf: pruefePdf,
    istFreigestellt: istFreigestellt,
    istIban: istIban,
    BEFUNDE_TEXT: BEFUNDE_TEXT,
    BEFUNDE_PDF: BEFUNDE_PDF,
    FREI_PFADE: FREI_PFADE,
    _meta: { herkunft: "PWA Toolpoint 2026-08-23", fassung: "1" }
  };
})(typeof window !== "undefined" ? window : globalThis);

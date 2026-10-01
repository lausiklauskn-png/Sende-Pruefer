# Sende-Prüfer — Sitzungs-Anker

Eine Seite, die einen Text prüft, **bevor** er an eine KI geht: Schlüssel,
Mailadressen, Telefonnummern, IBANs, Beträge, Rechnungsnummern und Namen werden
durch Platzhalter ersetzt, die Antwort kommt im Klartext zurück. Kein
Build-Schritt, läuft im Browser, auch direkt als Datei geöffnet.

Adresse: https://lausiklauskn-png.github.io/Sende-Pruefer/

## Das Postfach (seit 2026-09-28, Vorschau A)

Ordner **Eingefügt · Entwürfe · KI-Antworten · Exportiert**, Ansicht **Original ⟷
Was die KI sieht**, hell/dunkel (`sendepruefer_thema`, Knopf „☀ Hell“/„🌙 Dunkel“). Mails liegen in IndexedDB
`SendePruefer1` (Store `mails`) — **nie ändern**, sonst ist das Postfach leer.
Hinaus geht `ganzeMail(m)` + `\n\n---\n` + Bitte (Mail zuerst, damit die
Zeilennummern der Befunde die der Mail sind). Namen = Von/An + „Weitere Namen“.
Die Zuordnung wird beim Kopieren/Senden mit der Mail gespeichert. `.eml` (UTF-8,
RFC 2047, `X-Unsent: 1`) zum Speichern. **Teilen gibt Betreff + Text weiter, keine
Datei** — Chrome lehnt `.eml` beim Teilen ab (NotAllowedError an Klaus' Tablet,
2026-09-29); der Empfänger reist dabei nicht mit, die Meldung sagt das.
Mail einfügen liest Kopfzeilen, Quoted-Printable, Base64, multipart.
Beispiele erscheinen einmal beim ersten Öffnen (`sendepruefer_beispiele_v1`).

**Vollbild und Knöpfe (Klaus 2026-09-28):** das Raster füllt jedes Fenster
(`100dvh`, keine Höchstbreite, auch im Lesebereich keine Lesebreite — wie Gmail, Klaus 2026-09-29), `manifest.json` bleibt `display: standalone` —
dort hat das App-Fenster — ⧉ ✕. Eine Webseite kann ein Fenster nicht maximiert
erzwingen; der Browser merkt sich die Größe. `fullscreen` nähme die Knöpfe weg
(Gegenprobe-Fall). Die Knöpfe sind die Glas-Knöpfe aus Tomys Hub
(`tomy-ui/theme.css`: innere Schatten, Glanzpunkt folgt `--mx/--my`), in
Petrol statt Tomys Farben.

**Nächste Arbeit:** Anhänge prüfen (Brief `docs/BRIEF_2026-09-29_naechste-schritte.md`,
Stufe 2), danach Impressum/Datenschutz und Marktplatz-Einträge.

## Herkunft

Gebaut am 2026-09-26 nach dem Auftrag `Kimhub/auftraege/sende-pruefer.json`
(Prüfmerkmale 1–10). Die Fassungen der Werkstatt-Schichten liegen nur auf Klaus'
Gerät (`werkstatt/entwurf/`, gitignoriert) und in keinem Depot. Deshalb wurde
**neu gebaut, nicht übernommen**. Die Muster kamen aus dem Auslieferungsprüfer
(`pruefe-datei.py` · `pruefer-formate.js`).

## Der Prüfkern ist Sage-Modul 25 (seit 2026-09-28)

`modules/25_pseudonym.js` ist eine **byte-1:1-Kopie** aus
`Sage-Protokol/src/modules/` (Generation 2), in `tests/smoke.mjs` per SHA-256
gepinnt (`MODUL25_SHA`). Die Seite trägt **keine eigenen Muster** mehr; sie
übersetzt nur zwischen Modul und Oberfläche (`finde`, `verdecke`, `aufdecken`).
**Nie hier abwandeln** — in Sage ändern, neu kopieren, Pin nachziehen,
`CACHE_VERSION` erhöhen.

Vor dem Umzug liefen alte Erkennung und Modul auf **30 015 Texten** gegeneinander
(Köder, Bausteine, Zufallszeichen, fünf Namen-Listen): **0 Abweichungen** bei
Fundstellen, Zeilen, verdecktem Text, Zuordnung und Rückweg. Gegengeprüft: drei
eingebaute Fehler im Modul ergaben 30 · 168 · 168 Abweichungen.

Fehlt das Modul, steht ein Hinweis da und **nichts** wird kopiert oder gesendet.
Die Muster stehen weiter ein zweites Mal im Auslieferungsprüfer (LIESMICH Grenze 7).

## Ein SBKIM-Knoten, fest in der Kopfleiste (seit 2026-09-29)

Klaus: *„das komplette Siegel einbauen … oben in der Navi-Leiste verankert,
muss ja nicht fliegen"* · *„im Handy-Modus einfach nur die Lampen, und die dann
ausklappen"*. Bauart wie der Toolpoint-Marktplatz: **kein Modul 17**.

| | |
|---|---|
| Module | 01 02 03 04 05 05b 07 15 16 16b 23 23-UI noble — **byte-1:1 aus Sage** (`5ab4fbb`), in `tests/smoke.mjs` per SHA gepinnt (`KNOTEN_PINS`) |
| Klebstoff | `assets/sbkim-init.js` (Kette, Lampen, Auf-/Zuklappen, Gerätename) · `assets/siegel-inhalt.js` (Identität, Beschreibung — wird nie verteilt) |
| Schublade | `sendepruefer` — im `<head>` UND im Klebstoff. **Nie ändern.** |
| Leiste | `#netzleiste`: Lampen `#lamp-alive/-traffic/-fremd`, `#siegel-platz`, `[data-sbkim-mycel-platz]` |
| Membran | `allowedOrigins: []` — keine fremde Herkunft |

- **Breit (> 900 px):** Lampen mit Namen, Siegel und Mycel-Blase stehen in der Leiste.
  **Handy:** nur drei Punkte; ein Tipp klappt Namen (Kopie `data-lampe-kopie`),
  Siegel und Blase unter der Leiste auf — die Kopfleiste wächst dabei nicht.
- **Das Siegel braucht Maße aus dem CSS** (`#sbkim-siegel-badge` 28×28), sonst 0×0.
- **Die Kopfleiste lief schon auf `main` ~50 px über** (380 px). Seitdem am Handy
  schmalere Abstände, alle Teile gleich hoch (36/40 px, eine Probe misst es),
  Beschriftungen der Knöpfe erst ab 1201 px, Marke erst ab 401 px.
- **Beim Laden geht nichts ins Netz** — Verbinden nur auf Klick in der Mycel-Blase
  (Relais aus 05b: `relay.family-projekt.de`). Eine Probe zählt die Anfragen.
- **Die Abschirmung** (`assets/abschirmung.js`, app-eigen) meldet Funde über
  `sbkim:fremd-alert` an die FREMD-Lampe. Der Zuhörer hängt **schon beim Laden**
  des Klebstoffs, nicht erst nach der Kette — deshalb gibt es kein Nachholen.
- Die Module stehen **nicht** im Installations-Vorrat; der Worker legt sie beim
  ersten Abruf ab (wie beim Marktplatz, Sage LEHREN § 4).

## Handbuch, Icons und das große Bild (seit 2026-09-29)

Klaus: *„Oben Fragezeichen und so eine Art Handbuch … Ganz wichtig"* · *„so
aufgebaut, dass später eine Videosequenz es besser erklärt"*.

- **`?` in der Kopfleiste → `handbuch.html`**, eine eigene Seite (nicht Teil der
  vier Dateien unter 96 KB). **Gebaut, nicht von Hand:** `node tools/handbuch-bauen.mjs`
  fotografiert die echte App (Szenen in `tools/handbuch-szenen.mjs`, Vorlage
  `tools/handbuch-vorlage.html`) und schreibt `handbuch/NN-*.jpg`, `handbuch/szenen.json`
  und `handbuch.html`. **Wer die Oberfläche oder einen Sprechtext ändert, baut neu** —
  die Probe meldet sonst „veraltet".
- Jede Szene hat einen Leuchtring (Prozent) und einen **Sprechtext fürs Video**.
  **▶ Vorführen** liest nur mit einer Stimme **vom Gerät** vor (`localService`),
  sonst nur Untertitel — eine Netz-Stimme schickte den Text zu Google. Stopp und Esc.
- Ohne Skript stehen alle Szenen voll da (`html.bewegt` schaltet das Einblenden ein).
- **Icons:** das Schild mit Brief ist App-Icon und Favicon (`icons/`); das große
  Bild steht im leeren Lesebereich und **fliegt beim Öffnen einer Mail in die
  Kopfleiste** (`fliegen()`, 650 ms). Darüber ein **Lichtschein** auf **Klaus' eigenem
  Weg** (2026-09-29, im Lichtweg-Werkzeug gezogen: Start 4.4/58.6 · Mitte 52.5/45.7 ·
  Ende 88.8/35.6, zwei Bögen). **`tools/lichtweg.mjs` baut das CSS** zwischen den Marken
  `LICHTWEG-ANFANG/-ENDE` in `sende-pruefer.html` UND `tools/handbuch-vorlage.html`
  — nie von Hand ändern, Weg in `WEG` anpassen, dann `node tools/lichtweg.mjs` und das
  Handbuch neu bauen. 48 Punkte in gleichem Abstand, linear: kein Halt, **3,5 s** je
  Durchlauf. An Start, Mitte und Ende blitzt er auf (4-fach), in der Mitte über die ganze
  Höhe des Icons, dazwischen klein. In der Mitte **strahlt der Boden zurück**: das Bild
  liegt ein zweites Mal darüber (`plus-lighter`, Maske Schild + Boden), so leuchten die
  hellen, farbigen Streifen der Spiegelung heller — kein Fleck. Das Icon **wackelt** wie
  die Glas-Knöpfe in family-project (`wireHoloButtons`): der Schein spielt die Maus, die
  Stelle unter ihm gibt nach hinten nach (bis 12°, am Anfang/Ende null). Das Schweben
  läuft deshalb über `translate`, nicht `transform`. Bei „weniger Bewegung" fliegt,
  wackelt und leuchtet nichts.
- **Kein weißer Saum am Rand** (Klaus 2026-09-29: „weiße Blitzer an den runden Ecken").
  Beim Freistellen blieb außen ein heller Rest; entfernt in allen Bildern mit
  durchsichtigem Rand. Die Probe zählt fast weiße Pixel im Band neben der
  durchsichtigen Fläche (Bildrand zählt als durchsichtig). Gegengeprüft von Hand
  mit den alten Bildern: alle 7 rot. **Kein Gegenprobe-Fall** — `sed` tauscht kein Bild.
- ⚠ Das große Bild ist nur **1254 px** breit — bis Tablet-Breite scharf, darüber nicht.
- Ein Video wird eingebaut, sobald Klaus eins liefert (nicht vorgebaut).

## Aufgaben an die KI (seit 2026-09-29)

Klaus: *„vorausgefüllte Prompts nur noch anklicken … oder einen selbst ausgefüllten
Prompt … Rechnung, Mahnung, Angebot … daraus soll ein Prompt generiert werden."*
Im KI-Kasten: Aufgaben zum Antippen (`AUFGABEN.eingang`/`.sonst`), ein Feld „Eigene
Aufgabe" mit **Anweisung bauen** und **Als Knopf merken** (`sendepruefer_aufgaben`,
✕ vergisst). `anweisung(t)` baut die ganze Anweisung: Platzhalter in ⟦ ⟧ unverändert,
nichts erfinden, Fehlendes als [bitte ergänzen: …], nur der Text. Die Anweisung steht
in `m.bitte` und läuft durch `hinaus()` — Namen und Beträge darin werden mit verdeckt.
Für die 96 KB wurden die `═══`-Zierlinien der Kommentare gekürzt (kein Satz gestrichen).

## Anleitung als Seite (seit 2026-09-29)

Klaus: *„Das ist eine MD-Datei. Ich hätte gern … im Stile des gesamten Handbuches."*
`anleitung.html` wird aus `LIESMICH.md` **gebaut** (`node tools/anleitung-bauen.mjs`),
nie von Hand. LIESMICH.md bleibt die Quelle und zählt weiter zu den vier Dateien unter
96 KB; `anleitung.html` nicht. Alle Links „Anleitung und Grenzen" zeigen auf die Seite.
Die Tabelle wird am Handy zu Karten; gemessen wird die Tabelle selbst, nicht ihr Kasten
(`overflow:hidden` hätte eine zu breite Tabelle still abgeschnitten — so war ein
Gegenprobe-Fall zuerst blind). Wer LIESMICH.md ändert, baut neu, sonst wird die Probe rot.

## Schlüssel beim Anbieter erzeugen (seit 2026-09-29)

Klaus: *„Mir fehlt noch die Schlüsselgenerierung für KI … der Link direkt zum Anbieter.“*
Unter dem Schlüsselfeld steht „🔑 Schlüssel beim Anbieter erzeugen ↗“. Die Adresse
steht als `holen` in `ANBIETER` (Anthropic `console.anthropic.com/settings/keys`,
Mistral `console.mistral.ai/api-keys` — dieselben Adressen wie in den übrigen Apps
des Netzes) und wechselt mit dem Anbieter. Neuer Tab, `noopener noreferrer`. Keine
Zahl zu Startguthaben. Ob die Seiten beim Anbieter heute so heißen, ist aus dem
Behälter nicht gemessen.

## Mistral-Modell: small, nicht large (Klaus 2026-09-29)

Senden an Mistral lehnte ab: *403 „This model is not available in your subscription
tier"* — bei ausreichendem Guthaben. `mistral-large-latest` ist in Klaus' Tarif nicht
freigeschaltet. Umgestellt auf **`mistral-small-latest`**, das Workflow PDF und
BookLedgerPro schon benutzen. Kommt diese Ablehnung wieder, nennt die Meldung Modell
und Tarif („am Guthaben liegt es nicht"). Die Doku des Anbieters ist aus dem Behälter
gesperrt; ob small in seinem Tarif geht, zeigt erst sein nächster Versuch.

## Zu viele Anfragen: 429 (Klaus 2026-09-29)

Nach der Umstellung auf small kam an Klaus' Tablet *429 „Rate limit exceeded"* (der
Tresor hatte dabei den Schlüssel geöffnet). `assets/ablehnung.js` (app-eigen, außerhalb
der 96 KB): `holen()` wiederholt ein 429 **einmal**, nach Retry-After (höchstens 30 s)
oder nach 6 s, und sagt das an. `deuten()` erklärt Tarif (403), bleibendes 429 und 401.
Fehlt die Datei, sendet die Seite wie vorher ohne Wiederholung. ⚠ Wie hoch Mistrals
Grenze in Klaus' Zugang ist, ist nicht gemessen — die Doku des Anbieters ist aus dem
Behälter gesperrt.

**Und die Ausgabe-Grenze fehlte (Klaus' Limits-Seite, 13:29):** `mistral-small-2603` hat
**20 000 Tokens pro Minute** bei 1 Anfrage pro Sekunde. Die Anfrage an Mistral trug kein
`max_tokens`; solche Anbieter rechnen dann die volle mögliche Antwortlänge gegen die
Minuten-Grenze. Seitdem `max_tokens: 4096` wie bei Anthropic. ⚠ Dass das der Grund
für das bleibende 429 war, ist eine Folgerung — erst Klaus' nächster Versuch misst es.

## Tresor für den KI-Schlüssel (Klaus 2026-09-29)

Klaus: *„API-Schlüssel speichern mit dem eigenen Tresor … mit einem Code, so wie bei
Kim Hub Company … dann nur noch den kurzen Code eingeben."* Unter dem Schlüsselfeld:
**Tresor-Code** · **🔒 Im Tresor ablegen** · **🔓 Mit Code öffnen**.

- Das Schloss ist `assets/schluesseltresor.js`, **byte-1:1 aus kim-hub-company**
  (`1a4528d`, AES-256-GCM, PBKDF2-SHA256 600 000 Runden), in `tests/smoke.mjs` per SHA
  gepinnt (`TRESOR_SHA`). Genutzt werden nur `zu`/`auf`/`istPaketForm` — dessen
  `pruefeForm` kennt nur Anthropic-Schlüssel. **Nie hier abwandeln.**
- Klebstoff `assets/tresor-ui.js` (app-eigen, außerhalb der 96 KB): Paket je Anbieter
  unter `sendepruefer_tresor_<anbieter>`; Code und offener Schlüssel nur im Speicher,
  solange die Seite offen ist. Code mindestens 4 Zeichen.
- ⚠ **TAFEL-EVOLUTION: der Schlüssel wird nie mehr offen abgelegt.** Bis dahin schrieb
  die Seite ihn im Klartext nach `sendepruefer_key_<anbieter>` — auf `github.io` liest
  jede Geschwister-App mit. Ein alter Klartext-Eintrag wird noch gelesen und beim
  Ablegen im Tresor gelöscht. „Schlüssel löschen" nimmt auch den Tresor weg.
- ⚠ **Ein kurzer Code lässt sich durchprobieren**, wenn jemand die Ablage kopiert — das
  steht in LIESMICH Grenze 9 und im Hinweis am Feld.

## Die Erklärseite des Siegels (Klaus 2026-09-29)

„Ausführlich erklärt → So funktioniert das Mycel" im Siegel (Modul 16b, byte-1:1) legt
`sicherheit.html` als iframe in die Seite — die Datei fehlte, Klaus sah GitHubs 404. Sie ist
aus Kim-Bell übernommen (nur Titel, Kopf und Rückweg angepasst) und steht im Vorrat. Die
Abschirmung meldete dieses Fenster zugleich als „fremd"; `eigenesFenster()` nimmt jetzt genau
die eigene `sicherheit.html` aus (gleiche Herkunft, gleicher Ordner) — ein leeres oder fremdes
iframe wird weiter gemeldet. ✅ Die übrigen **neun** Knoten ohne `sicherheit.html` sind am selben Tag nachgezogen
(neutrale Fassung aus Sages Wurzel); die Regel steht in `Sage-Protokol/docs/PFLICHT_MODULE.md`.
**Seit dem Abend desselben Tages** trägt die Seite in allen 22 Fassungen den Abschnitt **„Was nützt mir das?"**
(Nutzen gegenüber Mail, belegte Quellen, Beispiele, Grafik zum eigenen abgeschirmten Netz, Bausteine mit Stand),
zwischen `NUTZEN-ANFANG`/`NUTZEN-ENDE`. Quelle: Sages Wurzel. family-project trägt beide Blöcke seit demselben Tag zweisprachig (DE/EN über `data-i18n`).

## Abschirmung: wegklicken, aufheben, im Fremdzugriff-Fenster (Klaus 2026-09-29)

- **✕ in der Warnzeile** (`#fremd-weg` → `AB.ausblenden()`): blendet sie aus, OHNE abzuschirmen — bis ein
  NEUER Fund kommt (`ausgeblendet()`: Zahl der Funde beim Wegklicken). Wer Rechtschreibprüfung oder
  Google mitlesen lassen will, lässt einfach offen.
- **Aufheben:** ein zweiter Tipp auf „Abgeschirmt" hebt die Abschirmung auf; der Knopf sagt das im `title`
  (gesetzt in `abschirmung.js`, nicht in der Seite — die vier Dateien sind fast voll: 98 114 von 98 304 Bytes).
- **Fremdzugriff-Fenster:** Modul 15 (byte-1:1) zählt nur fremde NACHRICHTEN — Klaus sah dort nichts, während
  die Abschirmung Funde hatte. Der Klebstoff in `sbkim-init.js` hängt nach einem Klick auf `#lamp-fremd` einen
  Block `[data-abschirm-im-fenster]` unter `[data-membran-summary]`: Funde (nur `textContent`) und ein Knopf
  **🛡 Jetzt abschirmen / Abschirmung aufheben** — derselbe Schalter `AB.umschalten()`.

## 📎 Anhänge prüfen (seit 2026-09-29, Stufe 1)

Klaus 2026-09-28: Anhänge „hin und zurück" prüfen. In jeder geöffneten Mail steht
vor „Mit KI" der Abschnitt **📎 Anhänge**: hinzufügen (📎), und jede Datei wird auf
dem Gerät geprüft. Eine `.eml` mit Anhang bringt ihre Dateien mit.

| Art | gesucht wird |
|---|---|
| Bild (PNG, JPEG, WebP) | Daten hinter dem Bildende (Bewegungsfoto, Samsung-Zusatz, ZIP/PDF) · EXIF (GPS nur, wenn IFD0 den Verweis 0x8825 trägt) · XMP · PNG-Textfelder |
| SVG | `<script>`, `on…=`, `javascript:`, `<foreignObject>`, fremde `href/src`; der Text geht an Modul 25 |
| Office / ZIP | Makros (`vbaProject.bin`), eingebettete Dateien, externe Verweise (`TargetMode="External"`), Programme im Archiv; Text + Verfasser → Modul 25 |
| PDF | über `assets/pruefer-formate.js` (**byte-1:1 aus Auslieferung-Pruefer `e9c4b06`, Fassung 2: UTF-16, Hex, XMP als UTF-8, keine Scheinströme**, SHA-gepinnt in `tests/anhaenge.mjs`) — dort pflegen, hier neu kopieren |
| alle | Programm am Dateikopf (MZ/ELF/#!) oder an der Endung · Endung ⟷ Dateikopf |

**🧼 Sichere Fassung** (Bilder und SVG): auf einer Leinwand neu gezeichnet, als
Download; die Meldung nennt, was entfernt ist. Eine SVG wird dabei zum PNG.

- ⚠ **DER PRÜFKERN WOHNT SEIT DEM 2026-09-29 IM AUSLIEFERUNGSPRÜFER** (Klaus: *„Ist
  das nicht dann dem Auslieferungsprüfer …?"*). `assets/pruefer-anhang.js` ist
  **byte-1:1 aus Auslieferung-Pruefer**, SHA-gepinnt in `tests/anhaenge.mjs`
  (`ANHANG_SHA`) — dort pflegen, hier neu kopieren, Pin nachziehen. Die Tabelle oben
  beschreibt, was diese Datei tut; der Auslieferungsprüfer öffnet damit Mail-Anhänge
  und hat einen Eingang „Datei prüfen".
- `assets/anhaenge.js` ist seitdem **nur noch die Oberfläche** und lädt den Kern
  nach (`bereit`). Fehlt er, heißt jeder Anhang **„ungeprüft"**, nie „sauber".
  Cache `sende-pruefer-v25`, beide Dateien in `CORE`.
- Stufe 2: **D (PDF-Seitentext) ist gebaut** (Abschnitt unten), Bildpunkte und Text im Bild sind **vorbereitet, nicht gebaut**:
  `docs/BRIEF_2026-09-29_anhaenge-stufe2.md`.
- `assets/anhaenge.js` (app-eigen, außerhalb der 96 KB). Die Seite trägt nur eine
  `<script>`-Zeile; die Datei hängt sich per MutationObserver an `#lesen` und liest
  die Seite über deren globale Namen (`aktuell`, `jetztSpeichern`, `finde`,
  `mailNamen`, `kopfTeilen`, `vonB64`, `kopfWort`). Fehlt sie, läuft die Seite wie vorher.
- Anhänge liegen als `m.anhaenge = [{id,name,typ,groesse,blob}]` an der Mail in
  `SendePruefer1/mails` — **keine neue DB-Version nötig**.
- ⚠ Der `.eml`-Zuhörer hängt **sofort** beim Laden, nicht nach DOMContentLoaded:
  das Seiten-Skript leert das Datei-Feld in seinem eigenen Zuhörer.
- ⚠ **Benannte Grenzen:** kein Virenscanner, keine Steganografie, **keine
  Texterkennung in Bildern** (Tesseract nicht
  eingebaut), GIF nur am Kopf. **An die KI geht weiterhin nur der Mailtext.**
  `.eml`-Export und Teilen nehmen die Anhänge seit 2026-09-29 mit (Abschnitt unten).
- ⚠ **Abweichung vom Brief:** die Befundarten stehen nicht im Köder (`koeder.txt`
  ist Text und liegt unter der 96-KB-Grenze). Die Probe baut ihre Dateien selbst
  (`tests/anhang-muster.mjs`, alle Angaben erfunden) — mit sauberer Gegenrichtung
  zu jeder Sorte.
- Gegenprobe `ANH:` (22 Fälle). Erster Lauf **20 gefangen · 2 blind**: ein Programm
  wurde nur an der Endung geprüft (Probe nannte immer `.exe`), und „speichert
  selbst" war blind, weil das 250-ms-Speichern der Seite die Anhänge mitnahm. Beide
  geschärft und nachgefahren: gefangen.
- ⚠ Nicht gemessen: echte Kamerafotos (Samsung-Zusatz, Bewegungsfoto) und echte
  Word/PDF-Dateien von Klaus' Gerät; die Muster sind gebaut.

## 📤 Anhänge gehen mit hinaus (Klaus 2026-09-29)

Klaus: *„beim Teilen der E-Mail wird der Anhang nicht mitgenommen … die .eml im
Mail-Programm geöffnet, der Anhang ist nicht da."* Beides stimmte: die Seite baute
.eml und Teilen nur aus dem Text.

- `assets/anhaenge.js` ersetzt beim Start `emlSpeichern` und `teilen` der Seite
  (`exportEinbauen`). **Ohne Anhang läuft der alte Weg unverändert.**
- **.eml:** `multipart/mixed`, Text wie bisher, jeder Anhang base64; Name als
  kodiertes Wort UND `filename*` (RFC 2231). Gemessen: jeder Anhang kommt Byte für
  Byte zurück.
- **Teilen:** Dateien ohne Warten gebaut (Teilen braucht den frischen Tipp); jede
  einzeln über `canShare` gefragt. Was das Gerät nicht annimmt (Chrome: z. B.
  .docx, .svg), wird **beim Namen genannt**, mit dem Weg über .eml.
- **KI-Antwort erbt** die Anhänge der Mail, aus der sie entstand — einmal, als
  eigene Kopie, sichtbar im 📎-Abschnitt (`data-anhang-geerbt`), dort zu entfernen;
  `m.anhaengeGeerbt` verhindert, dass ein entfernter wiederkommt.
- ⚠ Nicht gemessen: welche Mail-Programme am Tablet die Anhänge aus der .eml zeigen,
  und welche Dateiarten Klaus' Chrome beim Teilen annimmt.
- Gegenprobe `EXP:` (7 Fälle). Cache `sende-pruefer-v26`.

**Vorher sagen, was mitgeht (Klaus 2026-10-01).** Klaus hängte die .eml an eine neue
Telekom-Mail und öffnete sie in Chrome: nur Text, kaputte Umlaute — die Anhänge steckten
IN der Datei (172 KB), ein fremder Leser (Python `email`) findet alle. Seitdem:
- jede Anhang-Zeile fragt `navigator.canShare` (Chrome, Safari/iOS, Edge — keine geratene
  Liste je Browser) und sagt VOR dem Tippen: `data-teilbar` ja · nein · ohne (kein Teilen);
- eine Übersicht (`data-anhang-wege`): was beim Teilen mitgeht, was automatisch wegfällt,
  und dass die .eml ALLE trägt, aber ein Paket für ein Mail-Programm ist, kein Anhang für
  eine neue Mail; dieselbe Aussage in der Speichern-Meldung;
- „⬇ Einzeln speichern" je Anhang (`data-laden`), um Abgewiesenes von Hand anzuhängen.
- ⚠ Der 8bit-Textteil bleibt: gültiges MIME; die Umlaute zerfallen nur in Betrachtern, die
  eine .eml als Text lesen. Die Meldung ohne Anhang steht in der Seite (96-KB-Grenze) und
  sagt weiter „als Entwurf".
- Gegenprobe `TEILBAR:` (5 Fälle). Cache `sende-pruefer-v35`.

## 📄 Stufe 2 D · der Seitentext eines PDFs (seit 2026-09-29)

Klaus: C bekommt einen eigenen Knopf mit „Verdacht", E liest höchstens 10 Seiten
gegen — Reihenfolge D → A → B → E → C (Brief `docs/BRIEF_2026-09-29_anhaenge-stufe2.md`).

- `assets/pruefer-anhang.js` (7452e51) und **`assets/pruefer-mail.js`** (die Liste der
  KI-Anweisungen) sind byte-1:1 aus dem Auslieferungsprüfer, gepinnt in
  `tests/anhaenge.mjs` (`ANHANG_SHA`, `MAIL_SHA`). Dort pflegen, hier neu kopieren.
- `assets/anhaenge.js` lädt **PDF-Prüfer → KI-Liste → Anhang-Prüfer** der Reihe nach und
  setzt `pfade({pdfjs: "vendor/pdfjs/"})` — **seit 2026-09-30 im eigenen Ordner** (Klaus:
  *„Der Sendeprüfer sollte auch eigenständig arbeiten"*; byte-gleich aus dem
  Auslieferungsprüfer, SHA-gepinnt in `tests/anhaenge.mjs`, Lizenz in `THIRD_PARTY.md`,
  pdf-lib nur für Proben unter `tests/vendor/`). Keine ausgelieferte Datei nennt
  `Workflow-PDF` (Wächter), der Proben-Server liefert nur den eigenen Baum. pdf.js steht
  **nicht** im Vorrat; fehlt es, heißt der Seitentext „NICHT gelesen … ungeprüft".
  Gemessen in einer Kopie ohne Nachbarn: 374 grün · 0 ROT (15 weniger = Sage-Vergleich
  ⊘), `ALLEIN:` 2 gefangen. Cache `sende-pruefer-v29`.
- Gefunden wird `PDF-KI-ANWEISUNG` mit Seite und Zeile; der Seitentext geht an Modul 25
  (Angaben wie im Mailtext). Höchstens 100 Seiten, der Rest wird benannt.
- Proben: `seitentext()` ohne Browser und ein Block im Browser · Gegenprobe
  `NUR_FALL="PDFTEXT:"` (5 Fälle).
- ⚠ Nicht gemessen: echte PDFs aus Klaus' Postfach, das Tablet (Zeit, Speicher).

## Prüfen

```bash
npm install         # playwright-core
npm test            # tests/smoke.mjs — echter Browser, 240 Zusicherungen
npm run gegenprobe  # 96 eingebaute Fehler, jeder muss seine rote Zeile werfen
NUR_ANKER=1 bash tests/gegenprobe.sh   # nur die Anker, in Sekunden
```

Zuletzt gemessen (2026-09-29, Anhänge): **361 grün · 0 ROT** · `NUR_ANKER` **161 · 0 tot** · `ANH:` **22 gefangen · 0 blind** (nach Schärfung). Davor (2026-09-29, Abschirmung wegklicken/im Fenster): **311 grün · 0 ROT** · `NUR_ANKER` **139 · 0 tot** · `WEG:` **6 gefangen · 0 blind**. Davor (2026-09-29, fünf Anbieter + Erklärseite): **303 grün · 0 ROT** · `NUR_ANKER` **133 · 0 tot** · neue Fälle `ANB:` 5 · `EIGEN:` 2 · `HOL:`/`LIMIT:` nachgezogen: alle gefangen, 0 blind. Davor (2026-09-29, max_tokens für Mistral): **287 grün · 0 ROT** · `NUR_ANKER` **126 · 0 tot** · neuer Fall `LIMIT:` gefangen (erst ein toter Anker: die Zeile stand wortgleich bei Anthropic). Davor (2026-09-29, 429 einmal wiederholen): **286 grün · 0 ROT** · `NUR_ANKER` **125 · 0 tot** · `LIMIT:` **4 gefangen** · `TARIF:` (jetzt in `assets/ablehnung.js`) **1 gefangen**. Davor (2026-09-29, Tresor + Mistral small): **282 grün · 0 ROT** · `NUR_ANKER` **121 · 0 tot** · `TRESOR:` **6 gefangen** (einer erst blind: der Wächter prüfte vor Ende der 600 000 Runden, geschärft) · `TARIF:` **1 gefangen**. Davor (2026-09-29, Schlüssel-Link): **267 grün · 0 ROT** · `NUR_ANKER` **114 · 0 tot** · die vier `HOL:`-Fälle **4 gefangen · 0 blind · 0 aus falschem Grund**. Davor (2026-09-29, Tempo, Bodenschein, Wackeln): **240 grün · 0 ROT** · `NUR_ANKER` **96 · 0 tot** · die 13 Lichtschein-/Icon-Fälle **13 gefangen · 0 blind · 0 aus falschem Grund**. Davor (2026-09-29, Klaus' Lichtweg): **234 grün · 0 ROT** · `NUR_ANKER` **89 · 0 tot** · die sechs Lichtkegel-Fälle **6 gefangen · 0 blind · 0 aus falschem Grund** (ein Anker traf erst zweimal — `0%{scale:4` steht auch in `100%{scale:4` —, gemeldet und eindeutig gemacht). Davor (2026-09-29, weißer Saum entfernt): **229 grün · 0 ROT**. Davor (2026-09-29, Knoten + Abschirmung + Handbuch + Icons): **222 grün · 0 ROT** · Gegenprobe: erster voller Lauf über die Knoten-Fälle **68 gefangen · 2 blind · 2 aus falschem Grund** — alle vier in der Probe (überflüssiges Nachholen, Höhen-Prüfung übersah Teile unter 30 px, Lade-Prüfung zu früh, ein Stolpern nahm die Leisten-Prüfungen mit); danach diese vier und die 13 neuen `HB:`-Fälle einzeln gefahren: **17 gefangen · 0 blind · 0 aus falschem Grund**, `NUR_ANKER` **85 · 0 tot**. Ein voller Lauf über alle 85 danach ist **nicht** gefahren. Davor (2026-09-29, volle Lesebreite, Teilen als Text, Namen mit Komma): **106 grün · 0 ROT** · Gegenprobe **46 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**. Davor (2026-09-28, Vollbild + Themen-Knopf + Glas-Knöpfe): **102 grün · 0 ROT** · Gegenprobe **44 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker** (ein Anker zeigte nach dem Umbau des Themen-Knopfs ins Leere, von `NUR_ANKER` gemeldet und nachgezogen). Davor (2026-09-28, Postfach): **95 grün · 0 ROT** · Gegenprobe **39
gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**, erster Lauf. Davor
(2026-09-28, mit Beispiel-E-Mail): **68 grün · 0 ROT** · Gegenprobe
**26 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**. Davor
(2026-09-28, nach dem Umzug auf Modul 25): **62 grün · 0 ROT** ·
Gegenprobe **22 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**. Beim
ersten Lauf war die letzte Sicherung vor dem Hinausgehen **blind** — sie hatte nie
einen Wächter. Jetzt misst die Probe sie mit einem gestellten Prüfkern, der nichts
verdeckt. Davor (2026-09-26): **48 grün · 0 ROT** · Gegenprobe **14 gefangen ·
0 blind · 0 aus falschem Grund · 0 tote Anker**. Ein Fall war zuerst blind: das
Raster am Handy hält zwei Riegel (`minmax` und `overflow-wrap`), und nur beide
zusammen wegzunehmen misst etwas.

## Was hier leicht kaputtgeht

- **Die Beispiel-E-Mail** (⚙ → „Beispiel-E-Mail laden“, Klaus 2026-09-28) legt
  Petras Mail samt Namen und erfundener KI-Antwort neu an, ohne Doppel. Die Antwort nennt Platzhalter mit
  Nummern (⟦NAME-3⟧, ⟦MAIL-2⟧) — wer den Beispieltext oder die Namen ändert, prüft,
  ob die Nummern noch stimmen. Alles erfunden, `.example`-Adressen.

- **Die vier Dateien** (98 230 / 98 304 Bytes seit den Anhängen — neues in `assets/`) (`sende-pruefer.html`, `koeder.txt`, `LIESMICH.md`,
  `PROBE.md`) müssen **zusammen unter 96 KB** bleiben — die Probe misst es.
  Bis 2026-09-28 waren es 48 KB; Klaus hat für das Postfach auf 96 KB angehoben.
  Die Grenze gilt dem Code und der Anleitung, **nicht** den Mails (IndexedDB).
- **Die Anbieter stehen NUR in `assets/anbieter.js`** (seit 2026-09-29, vorher in der
  Seite — dort war kein Platz mehr). Reihenfolge = Auswahl: Claude · ChatGPT · Gemini ·
  OpenRouter · Mistral (Klaus: „Mistral ganz weit unten"). Ein freies Adressfeld ist die
  Hintertür durch die ganze Seite; die Probe besteht darauf, dass es keins gibt und die
  Seite selbst keine KI-Adresse trägt. Fehlt die Datei, geht nur Kopieren.
- **Zwei Protokolle:** Anthropic (Messages) und die OpenAI-Form (alle übrigen). `grenze`
  nennt das Feld für die Antwortlänge — `gpt-5-mini` lehnt `max_tokens` ab und will
  `max_completion_tokens`. Gemini liefert Fehler als LISTE; die Seite liest das erste Element.
- ⚠ **Belegt ist nur Claude** (an Klaus' Tablet gesendet). Gemini: CORS-Vorabfrage aus
  dem Behälter geprüft, angenommen. ChatGPT, OpenRouter: aus dem Behälter nicht erreichbar
  (Proxy 403), Adressen und Modelle nicht geprüft. Mistral: 429 an Klaus' Konto, danach
  Organisation gelöscht.
- **Modell-Vorgabe `claude-opus-5`**, aus der Anbieter-Liste des Auftrags. Im
  Zieltext des Auftrags stand `claude-haiku-4-5`. Gewählt ist die Liste, weil sie
  das Datum trägt; Klaus kann das in einer Zeile ändern.
- **Der Köder** trägt `# BEFUNDE: <Zahl>` im Kopf. Wer einen Fall ergänzt, zieht
  die Zahl nach, sonst wird der Selbsttest zu Recht rot.
- **Cache-Bump:** `CACHE_VERSION` in `sw.js`, wenn eine Datei aus `CORE` sich ändert.
- **Ein KI-Abo ist kein Schlüssel.** ChatGPT Plus, Claude Pro, Gemini Advanced bezahlen die
  Chat-Oberfläche; die Schnittstelle wird getrennt abgerechnet. Dafür ist der Kopieren-Weg da.
- **Speicher-Schlüssel app-eigen:** `sendepruefer_tresor_<anbieter>` (nur verschlossen) —
  `github.io` ist eine geteilte Adresse.

## Netzweit

Freibrief zum Selbst-Mergen · frisch von `origin/main` · Ton · kein PII ·
Ehrlichkeit: [Sage-Protokol/docs/NETZWEIT.md](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)

## 🔤 Stufe 2 A · Text im Bild (2026-09-30)

`assets/pruefer-anhang.js` byte-1:1 aus dem Auslieferungsprüfer (`ANHANG_SHA`
nachgezogen). Tesseract.js 7.0.0 (deu/eng/rus) byte-gleich unter
`vendor/tesseract/`, SHA-gepinnt in `tests/anhaenge.mjs`, Lizenzen in
THIRD_PARTY.md, **nicht** im Vorrat. `assets/anhaenge.js` setzt
`pfade({tesseract})`; ein Bild ohne lesbaren Text heißt **„Text im Bild
ungeprüft"** (`data-kennung="UNGEPRUEFT"`), nie „nichts gefunden"
(Tafel-Evolution eines Wächters). Anweisung im Bild → `BILD-KI-ANWEISUNG`,
gemessen an Vorlage 1A (`tests/bild-mit-anweisung.png`, erfunden). Cache v30.
`npm test` 404 grün · Gegenprobe `OCR:` 2 gefangen. ⚠ Tablet nicht gemessen.
An die KI geht weiterhin nur der Mailtext.

## 🌫 Stufe 2 B · blasser Text (2026-09-30)

`assets/pruefer-anhang.js` byte-1:1 aus dem Auslieferungsprüfer (#23, `ANHANG_SHA`
nachgezogen): jedes Bild wird zweimal gelesen, das zweite Mal nach einer
Kontrast-Spreizung; was nur dort steht, heißt „blass“ (`BILD-KI-ANWEISUNG`,
„blass, erst nach Kontrast-Spreizung lesbar“). Eine Frist für beide Durchgänge.
Probe mit Vorlage 2B (`tests/bild-blass.png`, erfunden). Cache v31.
`npm test` 405 grün. Die Gegenprobe `BLASS:` (6) steht im Auslieferungsprüfer.
⚠ Tablet nicht gemessen; ein Bild kostet jetzt etwa die doppelte Lesezeit.

## 👁 Stufe 2 E · unsichtbarer Text im PDF (2026-09-30)

`assets/pruefer-anhang.js` byte-1:1 aus dem Auslieferungsprüfer (`ANHANG_SHA`
nachgezogen). Die ersten 10 Seiten eines PDFs werden gegen ihr Seitenbild gelesen
(Texterkennung auf dem Gerät). Ein Wort der Textebene, das an seiner eigenen Stelle
keine Tinte hat (winzig, weiß, außerhalb der Seite), ist versteckt. Ab 2 solchen
Wörtern auf einer Seite gibt es `PDF-VERSTECKTER-TEXT` („Was man sieht und was im
Text steht, weicht ab (Seite n)"). Hinter Seite 10 und bei hängender Texterkennung
steht „nicht gegengelesen … ungeprüft", nie „kein Befund". Die Messung dazu steht im
Auslieferungsprüfer (CLAUDE.md § Stufe 2 E). Die Probe-PDF in `tests/anhaenge.mjs`
(weißer 1-pt-Text auf Seite 2) meldet im Browser Seite 2 und nicht Seite 1; gemessen
0,3 s je Seite (Behälter). Cache v36 (auf main war v35). `npm test` 418 grün.
Von Hand gegengeprüft: ohne den Befund fällt „Stufe 2 E im Browser" mit seinem Namen.
An die KI geht weiterhin nur der Mailtext. ⚠ Tablet nicht gemessen.

## 🌐 HTML-Anhänge (2026-09-30)

Ein Anhang, der mit `<!DOCTYPE html` oder `<html` beginnt (Kommentare davor erlaubt),
heißt **„HTML-Seite"** und geht durch den HTML-Prüfer des Auslieferungsprüfers.
`assets/pruefer.js` liegt **byte-1:1 aus Auslieferung-Pruefer** hier, gepinnt in
`tests/anhaenge.mjs` (`HTML_SHA`), steht in `CORE` und wird in `anhaenge.js` **vor**
`pruefer-anhang.js` geladen. `pruefer-anhang.js` ist neu kopiert (`ANHANG_SHA`).

- Übernommen wird nur **FREMDE-ADRESSE** (Skript, Zählpixel, Formular an einen fremden
  Rechner), mit Zeile. Weiter geht nur der **sichtbare** Text (ohne Kommentare, Skripte,
  Stile, Tags), sonst meldet die Angaben-Suche die Linkziele.
- Fehlt `pruefer.js`, steht **„HTML-Seite ungeprüft — der HTML-Prüfer fehlt"** da, nie
  „nichts gefunden". Eine `.txt`, die `<html>` nur erwähnt, bleibt Text.
- Nichts wird ausgeführt oder angezeigt; an die KI geht weiterhin nur der Mailtext.
- Gemessen: `npm test` **426 grün · 0 ROT** (Cache **v37**). Von Hand gegengeprüft: ohne
  die Lade-Zeile für `pruefer.js` werden die Reihenfolge-Prüfung und der Browser-Wächter
  rot, und die rote Zeile nennt den fehlenden Prüfer. Die Gegenprobe `HTMLANH:` (6 Fälle)
  steht im Auslieferungsprüfer.
- ⚠ Das Tablet ist nicht gemessen.
## 🏠 Startseite „Was die App kann“ (2026-10-01)

`start.html` steht beim ersten Öffnen vor der App: `index.html` leitet hin, solange
`sendepruefer_start_v1` nicht "1" ist (Haken „nicht mehr zeigen“); mit Suche/Hash geht
es direkt in die App. `manifest.json` startet über `index.html`. Die vier Dateien waren
voll (98 294 / 98 304) — der Weg zurück hängt deshalb im Klebstoff: `assets/sbkim-init.js`
macht die Marke in der Kopfleiste zum Link `#ueberblick`; am Handy (Marke ausgeblendet)
steht „Überblick“ im Handbuch (Vorlage `tools/handbuch-vorlage.html`). `assets/start.css`
ist identisch im Auslieferungsprüfer. ⚠ „Warum es diese App gibt“ und die Schritte unter
„Was tun“ sind ein Entwurf, nicht Klaus' Wortlaut. Gegenprobe `NUR_FALL="START:"`. Cache v38.

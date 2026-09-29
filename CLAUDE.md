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

**Nächste Arbeit:** Anhänge prüfen (Brief `docs/BRIEF_2026-09-29_postfach-umbau.md`,
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
  Kopfleiste** (`fliegen()`, 650 ms). Darüber ein **Lichtkegel**, der im Schild auf
  `scale(1.7)` wächst (Lichtbrechung) und danach wieder kleiner wird. Bei „weniger
  Bewegung" fliegt nichts und der Kegel steht still.
- ⚠ Das große Bild ist nur **1254 px** breit — bis Tablet-Breite scharf, darüber nicht.
- Ein Video wird eingebaut, sobald Klaus eins liefert (nicht vorgebaut).

## Prüfen

```bash
npm install         # playwright-core
npm test            # tests/smoke.mjs — echter Browser, 222 Zusicherungen
npm run gegenprobe  # 85 eingebaute Fehler, jeder muss seine rote Zeile werfen
NUR_ANKER=1 bash tests/gegenprobe.sh   # nur die Anker, in Sekunden
```

Zuletzt gemessen (2026-09-29, Knoten + Abschirmung + Handbuch + Icons): **222 grün · 0 ROT** · Gegenprobe: erster voller Lauf über die Knoten-Fälle **68 gefangen · 2 blind · 2 aus falschem Grund** — alle vier in der Probe (überflüssiges Nachholen, Höhen-Prüfung übersah Teile unter 30 px, Lade-Prüfung zu früh, ein Stolpern nahm die Leisten-Prüfungen mit); danach diese vier und die 13 neuen `HB:`-Fälle einzeln gefahren: **17 gefangen · 0 blind · 0 aus falschem Grund**, `NUR_ANKER` **85 · 0 tot**. Ein voller Lauf über alle 85 danach ist **nicht** gefahren. Davor (2026-09-29, volle Lesebreite, Teilen als Text, Namen mit Komma): **106 grün · 0 ROT** · Gegenprobe **46 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**. Davor (2026-09-28, Vollbild + Themen-Knopf + Glas-Knöpfe): **102 grün · 0 ROT** · Gegenprobe **44 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker** (ein Anker zeigte nach dem Umbau des Themen-Knopfs ins Leere, von `NUR_ANKER` gemeldet und nachgezogen). Davor (2026-09-28, Postfach): **95 grün · 0 ROT** · Gegenprobe **39
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

- **Die vier Dateien** (`sende-pruefer.html`, `koeder.txt`, `LIESMICH.md`,
  `PROBE.md`) müssen **zusammen unter 96 KB** bleiben — die Probe misst es.
  Bis 2026-09-28 waren es 48 KB; Klaus hat für das Postfach auf 96 KB angehoben.
  Die Grenze gilt dem Code und der Anleitung, **nicht** den Mails (IndexedDB).
- **Die Anbieter stehen NUR in `ANBIETER`.** Ein freies Adressfeld ist die
  Hintertür durch die ganze Seite; die Probe besteht darauf, dass es keins gibt
  und dass jede API-Adresse im Code in der Konstante steht.
- **Zwei Protokolle:** Anthropic (Messages) und Mistral (OpenAI-Form) — zwei
  Anfrage- und zwei Antwortformen. Nicht nur die Adresse tauschen.
- **Modell-Vorgabe `claude-opus-5`**, aus der Anbieter-Liste des Auftrags. Im
  Zieltext des Auftrags stand `claude-haiku-4-5`. Gewählt ist die Liste, weil sie
  das Datum trägt; Klaus kann das in einer Zeile ändern.
- **Der Köder** trägt `# BEFUNDE: <Zahl>` im Kopf. Wer einen Fall ergänzt, zieht
  die Zahl nach, sonst wird der Selbsttest zu Recht rot.
- **Cache-Bump:** `CACHE_VERSION` in `sw.js`, wenn eine Datei aus `CORE` sich ändert.
- **Speicher-Schlüssel app-eigen:** `sendepruefer_key_<anbieter>` —
  `github.io` ist eine geteilte Adresse.

## Netzweit

Freibrief zum Selbst-Mergen · frisch von `origin/main` · Ton · kein PII ·
Ehrlichkeit: [Sage-Protokol/docs/NETZWEIT.md](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)

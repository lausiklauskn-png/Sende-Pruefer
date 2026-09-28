# Brief — nächste Sitzung: der Sende-Prüfer wird ein Postfach

**Stand 2026-09-28 spät.** Diese Sitzung arbeitet **ausschließlich** am
Sende-Prüfer (`lausiklauskn-png/Sende-Pruefer`). Frisch von `origin/main`
abzweigen. Der alte Brief (`BRIEF_2026-09-28_neue-sitzung.md`) ist erledigt und
steht nur noch in der Git-Historie.

## Lies zuerst

1. `CLAUDE.md`, `LIESMICH.md` (Grenzen 1–9), `PROBE.md`
2. `docs/vorschau/A-postfach.html` — **die gewählte Vorschau**, läuft direkt aus
   dem Depot (holt `../../modules/25_pseudonym.js` und `gemeinsam.js`)
3. `Kimhub/auftraege/sende-pruefer.json` — Prüfmerkmale 1–10, Anbieter-Liste

## Was schon steht (auf `main` nachgesehen)

| | |
|---|---|
| Prüfkern | Sage-Modul 25 Generation 2, byte-1:1, SHA-gepinnt. Keine eigenen Muster in der Seite. 30 015 Vergleiche alt/neu: 0 Abweichungen |
| Fehlt das Modul | Hinweis, nichts wird kopiert oder gesendet |
| Beispiel | Knopf „Beispiel-E-Mail laden“ (erfundene Mail, Namen, KI-Antwort) |
| Proben | `npm test` 68 grün · Gegenprobe 26 gefangen · 0 blind |
| Cache | `sende-pruefer-v3` |

## Was Klaus entschieden hat (2026-09-28)

> „so aufgebaut wie ein E-Mail-Programm … E-Mail schreiben, E-Mail speichern,
> E-Mail zu KI, KI gibt entsprechende Antwort zurück. Hier wird anschließend
> die E-Mail konvertiert in EML und weitergeleitet oder geteilt mit einem
> E-Mail-Programm.“ — „so gut aufgebaut wie Tomys Hub, WorkFloh.“

Aus zwei Vorschauen hat er **A (Postfach)** gewählt: *„geht schon eher an ein
E-Mail-Programm heran und lenkt nicht so sehr vom Thema ab.“* B (Schreibtisch
mit Schwärzen) ist verworfen.

## Der Umbau

**Aufbau wie Vorschau A:** Ordner (Eingefügt · Entwürfe · KI-Antworten ·
Exportiert) · Liste mit „N Angaben werden verdeckt“ · Lesen/Schreiben mit
Umschalter **Original / Was die KI sieht** · „Mit KI beantworten“ · Antwort
als Entwurf mit echten Angaben · **Als .eml speichern** · **Teilen** ·
Kopieren. Am Handy eine Spalte nach der anderen, Ordnerleiste unten,
Verfassen-Knopf.

**Hell und dunkel** (Klaus 2026-09-28, nach der dunklen Ansicht am Tablet:
*„wenn es in zwei Designarten gemacht wird, also hell und dunkel“*): beide
Themen gleich sorgfältig, Vorgabe folgt dem Gerät, ein Knopf schaltet um, die
Wahl bleibt gespeichert (app-eigener Schlüssel). Die Vorschau hat den Knopf
„◐ Hell / Dunkel“ schon.

**Was aus der heutigen Seite mitmuss (nichts davon darf still wegfallen):**

1. **Zwei Wege, gleichrangig:** Kopieren (für das eigene KI-Abo) und Senden
   (mit Schlüssel). Anbieter nur aus `ANBIETER`, **kein freies Adressfeld**,
   zwei Protokolle (Anthropic Messages, Mistral OpenAI-Form).
2. **Namen:** Die Vorschau hatte kein Namensfeld. Vorschlag: Namen aus Von/An
   (Anzeigename vor der Adresse) automatisch, dazu je Mail eine Zeile
   „Weitere Namen“. Ohne Namen weiterhin der Hinweis, dass keiner verdeckt wird.
3. **Letzte Sicherung** (`findLeak`) vor jedem Kopieren und Senden.
4. **Selbsttest mit Köder** — darf in ein Menü (⚙ oder Hilfe), bleibt aber.
5. **Schlüssel** app-eigen (`sendepruefer_key_<anbieter>`), löschbar.
6. **Beispiel-Mails** als Startzustand bei leerem Postfach, klar als erfunden
   markiert.

**Neu:**

- **Speichern der Mails** nur auf dem Gerät (IndexedDB, Schlüssel app-eigen,
  z. B. DB `SendePruefer1`). Nichts davon geht ins Netz. Zuordnung
  (Platzhalter → Klartext) je Mail mitgespeichert, damit eine später
  eingefügte Antwort zurückübersetzt werden kann.
- **.eml:** `To`, `Subject` (Re: …), `MIME-Version`, `Content-Type:
  text/plain; charset=utf-8`, `X-Unsent: 1` (Outlook öffnet dann als Entwurf).
  Nicht-ASCII-Betreff nach RFC 2047 kodieren. Herunterladen als Datei **und**
  Teilen über `navigator.share({ files })`, wo es geht.
- **Einfügen einer empfangenen Mail**: Knopf „Mail einfügen“ (Text aus der
  Zwischenablage oder eine `.eml`-Datei öffnen und Kopfzeilen lesen).

## Was dabei aufzupassen ist

- ⚠ **Die 48-KB-Grenze für die vier Dateien** reicht für ein Postfach
  vermutlich nicht. **Nicht still anheben** — Klaus vorher sagen, um wie viel
  und warum (Tafel-Evolutions-Klausel).
- ⚠ Die heutigen 68 Zusicherungen und 26 Gegenprobe-Fälle messen die alte
  Oberfläche. **Jede Zusicherung wird übertragen, nicht gestrichen** — was
  wegfällt, wird mit Grund benannt.
- ⚠ Modul 25 nicht anfassen. Braucht der Umbau mehr vom Prüfkern, ist das die
  „separate Baustelle“ (Klaus) — in Sage, eigene Sitzung.
- `CACHE_VERSION` erhöhen, `manifest.json` prüfen.

## Anhänge prüfen — hin und zurück (Klaus 2026-09-28)

> *„Es sollen auch Dokumente, die ich senden kann, ob Bilder oder andere
> Sachen, geprüft werden können, ob irgendwo Textfragmente drin sind oder
> vielleicht sogar im Code irgendetwas versteckt ist … auch auf dem Rückweg,
> ob Bilder, die zu mir gekommen sind, Code enthalten statt reines Bild."*

**Eigene Stufe nach dem Postfach**, nicht in denselben Bau mischen. Eine Mail
bekommt Anhänge (📎); jeder Anhang wird geprüft, **bevor** er an eine KI geht
(hin) und wenn er von außen kommt (zurück, `.eml` mit Anhang).

Was sich messen lässt — und nur das wird versprochen:

| Art | was gesucht wird |
|---|---|
| **Bild** (JPEG, PNG, WebP, GIF) | Daten **hinter** dem Bildende (JPEG nach `FFD9`, PNG nach `IEND`) · Text in EXIF/XMP/PNG-Textblöcken (Kamera, GPS, Kommentar) · Dateiendung ⟷ echter Dateikopf · sichtbarer Text im Bild über Texterkennung (Tesseract liegt in Workflow-PDF unter `/Workflow-PDF/vendor/`, gleiche Adresse) — der Text geht dann durch Modul 25 |
| **SVG** | Skripte, `on…`-Handler, fremde Adressen — ein SVG ist Code, kein Bild |
| **PDF** | JavaScript, eingebettete Dateien, Formular-Aktionen, Text der Seiten durch Modul 25 |
| **Office** (docx/xlsx) | Makros (`vbaProject.bin`), Text durch Modul 25 |

**Die sichere Fassung für die KI:** ein Bild wird über eine Leinwand **neu
gezeichnet** und nur das geht hinaus — das wirft Metadaten und angehängte
Daten weg. Gezeigt wird, was entfernt wurde.

Vorlage ist der Auslieferungsprüfer (`assets/pruefer-formate.js`, u. a.
`pruefePdf`, `/JavaScript`) — **kopieren und hier weiterbauen, dort nichts
ändern.** Jede Befundart bekommt einen Fall im Köder und einen
Gegenprobe-Fall.

⚠ **BENANNTE GRENZE, auf der Seite und im Datenschutz:** das ist kein
Virenscanner. Text, der nur als Muster in Pixeln steckt (Steganografie), findet
keine dieser Prüfungen; die Texterkennung liest nur, was lesbar ist. Die Seite
sagt, was geprüft wurde — nicht, dass eine Datei „sauber" ist.

## Danach (eigene Schritte, nicht in dieser Sitzung vermischen)

Impressum + Datenschutz (echte Angaben wie beim Auslieferungsprüfer, § 5 DDG;
Datenschutz nennt beide Anbieter, dass nur der verdeckte Text hinausgeht und
dass Mails nur auf dem Gerät liegen) · Marktplatz-Einträge in PWA-Toolpoint und
family-project · gegenseitiger Verweis beider Prüfer.

**Nicht in dieser Sitzung:** Auslieferungsprüfer · Modul 26 · Erweiterung von
Modul 25 · SBKIM-Knoten für den Sende-Prüfer.

## Abschluss

Klaus die neue Adresse **im Chat** hinlegen (Sichttest am Tablet ist nicht
ersetzbar) · Abschlussbrief mit Stundennachweis aus dem Reflog (Beginn
aufrunden, Ende abschneiden, Ende erst nach dem Commit) · Forschungseintrag in
Kimhub (`node tools/sitzung-eintragen.mjs`, Feld `arm`) · neuer Brief als
Codeblock im Chat · „Nächste Schritte“.

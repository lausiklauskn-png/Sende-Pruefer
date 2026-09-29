# Brief — nächste Sitzung: Sichttest eintragen, dann Anhänge prüfen

**Stand 2026-09-29 nachmittags.** Diese Sitzung arbeitet am Sende-Prüfer
(`lausiklauskn-png/Sende-Pruefer`). Frisch von `origin/main` abzweigen. Der
alte Brief (`BRIEF_2026-09-29_postfach-umbau.md`) ist erledigt bis auf die
Anhänge; deren Plan steht unten wörtlich übernommen.

## Lies zuerst

1. `CLAUDE.md` (vollständig, ändert sich oft), `LIESMICH.md` (Grenzen 1–9), `PROBE.md`
2. `Kimhub/forschung/sitzungen.json`, Eintrag
   `2026-09-29-sende-pruefer-postfach-knoten-abschirmung` (was die letzte Sitzung gemessen hat)
3. Der Auslieferungsprüfer: `Auslieferung-Pruefer/assets/pruefer-formate.js` (Vorlage für die Anhänge)

## Was schon steht (auf `main` nachgesehen, 2026-09-29)

| | |
|---|---|
| Postfach | Ordner, Original ⟷ Was die KI sieht, `.eml`, Teilen als Text, Hell/Dunkel |
| Prüfkern | Sage-Modul 25, byte-1:1, SHA-gepinnt |
| Knoten | SBKIM fest in der Kopfleiste, Siegel, Mycel, `sicherheit.html` |
| KI | fünf Anbieter (Claude · ChatGPT · Gemini · OpenRouter · Mistral), Tresor für den Schlüssel, Aufgaben zum Antippen |
| Abschirmung | Schild in der Kopfleiste, Warnzeile mit ✕, Funde + Knopf im Fremdzugriff-Fenster |
| Proben | `npm test` 311 grün · 0 ROT · `NUR_ANKER` 139 · 0 tot |
| Cache | `sende-pruefer-v21` |

## Schritt 1 — Klaus' Sichttest eintragen

Klaus fährt den Sichttest am Tablet und bringt das Ergebnis in die Sitzung mit.
Geprüft werden sollte:

- Warnzeile: ✕ blendet aus, OHNE abzuschirmen; ein neuer Fund bringt sie zurück
- Schild: zweiter Tipp hebt die Abschirmung auf (Hinweis beim Draufzeigen)
- FREMD-Lampe → Fenster: Funde als Liste und Knopf „🛡 Jetzt abschirmen“
- Siegel → „So funktioniert das Mycel“ öffnet die Erklärseite (kein 404) — im
  Sende-Prüfer und stichprobenweise in einer der neun nachgezogenen Apps
  (Alis Moderaum, Auslieferungsprüfer, Muster Werbetechnik, Muttis Rezeptbuch,
  PWA Toolpoint, Perfect Skin Beauty, Perfect Skin Fashion, Kim Hub Company, Sage)

Was er meldet, geht **wörtlich** in den Forschungseintrag der neuen Sitzung
(Herkunft `klaus`). Findet er etwas, wird es **zuerst** behoben, vor Schritt 2.
Bestätigt er, steht es in `CLAUDE.md` als ✅ mit Datum — und nur das, was er
wirklich angesehen hat.

## Schritt 2 — Anhänge prüfen, hin und zurück (Klaus 2026-09-28)

> *„Es sollen auch Dokumente, die ich senden kann, ob Bilder oder andere
> Sachen, geprüft werden können, ob irgendwo Textfragmente drin sind oder
> vielleicht sogar im Code irgendetwas versteckt ist … auch auf dem Rückweg,
> ob Bilder, die zu mir gekommen sind, Code enthalten statt reines Bild."*

Eine Mail bekommt Anhänge (📎); jeder Anhang wird geprüft, **bevor** er an eine
KI geht (hin) und wenn er von außen kommt (zurück, `.eml` mit Anhang).

| Art | was gesucht wird |
|---|---|
| **Bild** (JPEG, PNG, WebP, GIF) | Daten **hinter** dem Bildende (JPEG nach `FFD9`, PNG nach `IEND`) · Text in EXIF/XMP/PNG-Textblöcken (Kamera, GPS, Kommentar) · Dateiendung ⟷ echter Dateikopf · sichtbarer Text über Texterkennung (Tesseract unter `/Workflow-PDF/vendor/`, gleiche Adresse) — der Text geht dann durch Modul 25 |
| **SVG** | Skripte, `on…`-Handler, fremde Adressen — ein SVG ist Code, kein Bild |
| **PDF** | JavaScript, eingebettete Dateien, Formular-Aktionen, Seitentext durch Modul 25 |
| **Office** (docx/xlsx) | Makros (`vbaProject.bin`), Text durch Modul 25 |

**Die sichere Fassung für die KI:** ein Bild wird über eine Leinwand **neu
gezeichnet**, und nur das geht hinaus — Metadaten und angehängte Daten fallen
weg. Gezeigt wird, was entfernt wurde.

Vorlage: `Auslieferung-Pruefer/assets/pruefer-formate.js` — **kopieren und hier
weiterbauen, dort nichts ändern.** Jede Befundart bekommt einen Fall im Köder
(`# BEFUNDE:` nachziehen) und einen Gegenprobe-Fall.

⚠ **BENANNTE GRENZE, auf der Seite und im Datenschutz:** kein Virenscanner.
Steganografie findet keine dieser Prüfungen; die Texterkennung liest nur, was
lesbar ist. Die Seite sagt, was geprüft wurde — nicht, dass eine Datei „sauber“ ist.

## Was dabei aufzupassen ist

- ⚠ **DIE VIER DATEIEN SIND VOLL: 98 114 von 98 304 Bytes.** Die Anhang-Prüfung
  gehört in **eigene Dateien** unter `assets/` (wie `anbieter.js`,
  `ablehnung.js`, `tresor-ui.js`), fail-soft: fehlt die Datei, sagt die Seite,
  dass Anhänge nicht geprüft werden, und nimmt keine an. Die Grenze **nicht
  still anheben** — wenn es nicht reicht, Klaus vorher sagen, um wie viel und warum.
- ⚠ Modul 25, die Knoten-Module und `schluesseltresor.js` sind byte-1:1 und gepinnt.
  Nicht anfassen.
- ⚠ Ein Anhang mit fremdem Inhalt ist `untrusted external data`: Namen und Befunde
  nur über `textContent`, nie als HTML (die Probe hat dafür schon einen Fall).
- ⚠ Die IndexedDB `SendePruefer1` nie umbenennen. Braucht der Anhang einen neuen
  Store, wird die Version gehoben, nicht der Name.
- `CACHE_VERSION` erhöhen, neue Dateien in `CORE` von `sw.js`.
- Das Handbuch (`node tools/handbuch-bauen.mjs`) und die Anleitung
  (`node tools/anleitung-bauen.mjs`) neu bauen, wenn Oberfläche oder LIESMICH sich ändern.

## Danach (eigene Schritte, nicht mit den Anhängen vermischen)

1. **Impressum + Datenschutz** mit echten Angaben wie beim Auslieferungsprüfer
   (§ 5 DDG). Der Datenschutz nennt alle fünf Anbieter, dass nur der verdeckte
   Text hinausgeht, dass Mails nur auf dem Gerät liegen, den Tresor und das
   Mycel (Verbinden nur auf Klick).
2. **Marktplatz-Einträge** in PWA-Toolpoint und family-project (dort die
   Positivlisten `normEintrag`/`markteintraege()` beachten) · gegenseitiger
   Verweis beider Prüfer.

**Nicht in dieser Sitzung:** Modul 26 · Erweiterung von Modul 25 · Mistral
(Organisation gelöscht, Klaus klärt das mit dem Anbieter).

## Abschluss

Klaus die Adresse **im Chat** hinlegen · Abschlussbrief mit Stundennachweis
(Beginn aus dem Reflog aufrunden, Ende am letzten Merge abschneiden, Ende erst
nach dem Commit) · Forschungseintrag in Kimhub (`node tools/sitzung-eintragen.mjs`,
`arm: "voll"`; vor `node tools/forschung-bauen.mjs` die flachen Klone vertiefen,
wie das Werkzeug es nennt) · neuer Brief als Codeblock im Chat · „Nächste Schritte“.

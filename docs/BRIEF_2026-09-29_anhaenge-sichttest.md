# Brief — nächste Sitzung: Sichttest eintragen, Anhänge Stufe 2

**Stand 2026-09-29 abends.** Sende-Prüfer (`lausiklauskn-png/Sende-Pruefer`).
Frisch von `origin/main` abzweigen.

## Lies zuerst

1. `CLAUDE.md` — besonders § „📎 Anhänge prüfen“ (neu, PR #25)
2. `LIESMICH.md` (Grenzen 1–9, Grenze 6 neu), `PROBE.md`
3. `Kimhub/forschung/sitzungen.json`, Eintrag `2026-09-29-sende-pruefer-anhaenge`

## Was steht (auf `main` nachgesehen, 2026-09-29)

| | |
|---|---|
| Anhänge | 📎 in jeder Mail; Bild · SVG · Office · PDF · Programm/Endung; Text aus SVG/Office → Modul 25; 🧼 Sichere Fassung; `.eml` bringt Anhänge mit |
| Dateien | `assets/anhaenge.js` (app-eigen), `assets/pruefer-formate.js` (byte-1:1, SHA-gepinnt) |
| Proben | `npm test` 361 grün · 0 ROT · `NUR_ANKER` 161 · 0 tot · `ANH:` 22 gefangen |
| Cache | `sende-pruefer-v23` |
| vier Dateien | 98 230 / 98 304 Bytes — Neues gehört nach `assets/` |

## Schritt 1 — Klaus' Sichttest eintragen (offen aus dem letzten Brief)

- Warnzeile ✕ blendet aus, ohne abzuschirmen; neuer Fund bringt sie zurück
- zweiter Tipp auf das Schild hebt die Abschirmung auf
- FREMD-Lampe → Fenster: Funde und „🛡 Jetzt abschirmen“
- Siegel → „So funktioniert das Mycel“: „Was nützt mir das?“, kein 404; eine weitere App stichprobenweise
- **neu:** 📎 Anhang hinzufügen mit einem echten Kamerafoto, einem echten Word-Dokument
  und einem echten PDF; 🧼 Sichere Fassung speichern; eine `.eml` mit Anhang einfügen

Klaus' Worte wörtlich in den Forschungseintrag (Herkunft `klaus`). Was er
findet, wird zuerst behoben. ✅ in CLAUDE.md nur für das, was er gesehen hat.

## Schritt 2 — Anhänge, Stufe 2 (nur wenn Klaus es will)

- Text in Bildern: Tesseract liegt in `Workflow-PDF/vendor/tesseract/` (21 MB, gleiche
  Adresse) — nachladen wie die WorkFlohs, Ergebnis → Modul 25. Nicht im Vorrat.
- PDF-Seitentext: pdf.js ebenfalls von Workflow-PDF nachladen.
- Anhänge beim `.eml`-Export mitgeben.
- ⚠ Weiter gilt: keine Datei geht an die KI; kein Virenscanner.

## Danach (eigene Schritte)

1. Impressum + Datenschutz mit echten Angaben (§ 5 DDG); Datenschutz nennt die Anhänge
2. family-project: Nutzen-Kasten, zweisprachig
3. Marktplatz-Einträge in PWA-Toolpoint und family-project

## Leitplanken

- Modul 25, Knoten-Module, `schluesseltresor.js`, `pruefer-formate.js` nicht abwandeln
- Namen und Befunde nur über `textContent`
- IndexedDB `SendePruefer1` nie umbenennen
- `CACHE_VERSION` erhöhen, neue Dateien in `CORE`; Handbuch/Anleitung neu bauen

## Abschluss

Adresse in den Chat · Abschlussbericht mit gemessenem Stundennachweis (Reflog →
letzter Merge) · Forschungseintrag in Kimhub (`arm: "voll"`, flache Klone vorher
vertiefen) · neuer Brief als Codeblock · „Nächste Schritte“.

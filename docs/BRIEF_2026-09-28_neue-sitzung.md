# Brief — nächste Sitzung: der Sende-Prüfer als eigene App

**Stand 2026-09-28 abends.** Diese Sitzung arbeitet **ausschließlich** am
Sende-Prüfer (Repo `lausiklauskn-png/Sende-Pruefer`). Der Auslieferungsprüfer
ist abgeschlossen (Klaus: „ist alles in Ordnung … funktioniert“), er ist nicht
anzufassen.

## Lies zuerst

1. `Sende-Pruefer/CLAUDE.md`, `LIESMICH.md` (Grenzen 1–9), `PROBE.md`
2. `Kimhub/auftraege/sende-pruefer.json` — Prüfmerkmale 1–10, Anbieter-Liste
3. Zum Vergleich, nur lesen: `Auslieferung-Pruefer/CLAUDE.md` und seine Seite
4. Frisch von `origin/main` abzweigen.

## Was es heute gibt (gemessen 2026-09-28, nicht erinnert)

| | |
|---|---|
| Adresse | https://lausiklauskn-png.github.io/Sende-Pruefer/ (Pages läuft, letzter Bau 2026-09-26) |
| Dateien | `sende-pruefer.html` 29 KB · `koeder.txt` · `LIESMICH.md` · `PROBE.md`, zusammen 37 KB (Grenze 48 KB) |
| Prüfen | `npm test` 48 grün · Gegenprobe 14 gefangen (Stand 2026-09-26) |
| Farben | schon die von PWA Toolpoint (`--grund:#0c1016`, `--akzent:#f2b544`) |
| Sprache | nur Deutsch (`<html lang="de">`, kein Wörterbuch) |
| **Impressum / Datenschutz** | **fehlen** — die Seite schickt auf Knopfdruck Text an Anthropic oder Mistral. Der Auslieferungsprüfer hat beides |
| Marktplätze | steht **weder** in PWA Toolpoint **noch** in family-project |
| SBKIM | kein Knoten, kein Siegel |
| nicht gemessen | ein echter Senden-Aufruf mit Schlüssel · Klaus' Sichttest am Tablet · ob der verdeckte Text für eine KI brauchbar ist |

## Was Klaus will (2026-09-28, wörtlich)

> „Der Sendeprüfer wird jetzt als eigene App behandelt … Design soll angepasst
> werden an Auslieferungsprüfer, würde ich eher sagen. Und oder mach selber
> Vorschläge. Vielleicht können wir den Sendeprüfer doch etwas anders
> gestalten … etwas interessanter … Obwohl der [Auslieferungsprüfer] auch
> schon ein gutes Niveau hat. Funktional, einfach aufgebaut, nicht für
> Schnickschnack und funktioniert. Lässt sich überall einfügen, in jede App,
> in jede Internetseite … Sodass wir … die Sendeprüfer und Auslieferungsprüfer
> als Vorinstanz nehmen können, um E-Mails zu prüfen und um Internetseiten zu
> prüfen, bevor sie in Aktion treten auf unserem Rechner. Oder bevor wir etwas
> herausschicken oder entgegennehmen. Das ist das eigentliche Ziel. Also
> vielleicht ist das sinnvoll, vielleicht auch nicht. Das wirst du jetzt bitte
> prüfen.“

## Die Aufgabe — erst prüfen, dann Klaus fragen, dann bauen

**Schritt 1 · Die Ziel-Frage prüfen und Klaus in EINER Nachricht vorlegen.**
„Vorinstanz vor dem Senden und Empfangen“ — was geht davon wirklich?

- **Geht:** eine Seite, in die man einfügt, bevor man etwas an eine KI oder
  einen Menschen schickt (das ist der Sende-Prüfer heute). Und der Kern als
  **eine eigene Datei** (wie `pruefer.js` beim Auslieferungsprüfer), die jede
  andere App von Klaus einbinden kann — „lässt sich überall einfügen“. Heute
  steckt alles in einer HTML-Datei.
- **Geht nicht aus einer Webseite:** sich von selbst zwischen das
  Mailprogramm und den Nutzer schalten, eingehende Mails abfangen oder eine
  fremde Seite prüfen, bevor der Browser sie öffnet. Das kann nur ein Programm
  auf dem Gerät oder eine Browser-Erweiterung (NETZWEIT § 6b: Grenzen einer
  Webseite nachschlagen). Der Weg, der geht: der Nutzer fügt ein oder teilt
  hinein (Android „Teilen“ → Sende-Prüfer; dafür braucht das Manifest ein
  `share_target`).
- **Überschneidung benennen:** der Auslieferungsprüfer prüft E-Mails schon
  (fünfter Eingang, `pruefer-mail.js`: Links, Anhänge, versteckte
  KI-Anweisungen). Der Sende-Prüfer verdeckt eigene Daten vor dem Senden.
  Eingang und Ausgang — zwei Richtungen, nicht zweimal dasselbe.

Klaus entscheidet, was davon gebaut wird. Nicht vorher bauen.

**Schritt 2 · Gestaltung: zwei Vorschläge mit Bild, nicht mit Worten.**
(a) wie der Auslieferungsprüfer (Kopfleiste, Karten, Fuß mit Impressum —
dieselbe Familie) oder (b) eine eigene, etwas lebendigere Fassung. Beide als
Vorschau (Artifact) am Handy-Maß zeigen, Klaus wählt.

**Schritt 3 · Was ohnehin fehlt und klein ist** (nach Klaus' Wort):
Impressum und Datenschutz (echte Angaben wie im Auslieferungsprüfer, § 5 DDG;
Datenschutz nennt die zwei Anbieter und dass nur der verdeckte Text gesendet
wird) · Eintrag im Marktplatz PWA Toolpoint und family-project.

## Nicht in dieser Sitzung

Auslieferungsprüfer · alte Prüferseite auf pwa-toolpoint.de · SBKIM-Knoten für
den Sende-Prüfer (erst wenn Klaus es will) · Sage PFLEGE-LISTE § 11 ·
Server-Gegenprobe.

## Arbeitsregel (Klaus hat sie noch nicht bestätigt, gilt als Vorschlag)

Jede Aufgabe nennt vor dem Bau, was ein Nutzer danach sieht. Zeigt eine
Messung „kein Schaden“, endet die Arbeit dort. Proben nur für Code, der sich
für den Nutzer ändert — kein Wächter über einem Wächter.

## Abschluss

Abschlussbrief mit Stundennachweis aus dem Reflog (Beginn aufrunden, Ende
abschneiden, Ende erst nach dem Commit) · Forschungseintrag in Kimhub
(`node tools/sitzung-eintragen.mjs`, Feld `arm` Pflicht) · neuer Brief als
Codeblock im Chat.

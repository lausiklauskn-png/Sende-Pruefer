# Brief — Anhänge, Stufe 2: was in Bildern und PDFs VERSTECKT sein kann

**Vorbereitet 2026-09-29, nichts davon ist gebaut.** Klaus: *„Bilder zu prüfen,
PDFs zu prüfen … ob Botschaften oder Nachrichten in Bildern verschlüsselt sind
oder eingelagert sind, die dann KI ansprechen sollen … die in Bildpunkten
versteckt sind. Text in Bildern und der Seitentext von PDFs werden noch nicht
gelesen."*

Gilt für **beide** Werkzeuge. Gepflegt wird im **Auslieferungsprüfer**
(`assets/pruefer-anhang.js`), byte-1:1 in den Sende-Prüfer kopiert — so wie
seit dem 2026-09-29 die ganze Anhang-Prüfung.

## Lies zuerst

1. `Auslieferung-Pruefer/CLAUDE.md` § „📎 Anhänge öffnen und einzelne Dateien prüfen"
2. `Sende-Pruefer/CLAUDE.md` § „📎 Anhänge prüfen"
3. `Workflow-PDF/CLAUDE.md` § „📷 Scannen" (Tesseract) und § „🌐 Übersetzen" (pdf.js, Texterkennung)

## Was heute geprüft wird — und was nicht

| | heute | Stufe 2 |
|---|---|---|
| Daten hinter dem Bildende, Metadaten, SVG-Skripte | ✅ | — |
| **Text, den man im Bild SIEHT** | ❌ | A · Texterkennung → Modul 25 + KI-Anweisungen |
| **Text, den man im Bild FAST nicht sieht** (Grau auf Grau, winzig) | ❌ | B · Texterkennung nach Kontrast-Spreizung, Unterschied zu A |
| **Botschaft in den Bildpunkten** (Steganografie) | ❌ | C · statistischer Verdacht, kein Auslesen |
| **Seitentext eines PDF** | ❌ | D · pdf.js → Modul 25 + KI-Anweisungen |
| **Text im PDF, der nicht zu sehen ist** (weiß, winzig, außerhalb der Seite) | ❌ | E · Textebene gegen Texterkennung des gerenderten Bilds |

## A · Text im Bild lesen

- Tesseract liegt in `Workflow-PDF/vendor/tesseract/` (21 MB, DE/EN/RU). Alle
  drei Apps stehen auf `lausiklauskn-png.github.io` → nachladen von
  `/Workflow-PDF/vendor/tesseract/`, **nicht** in den Installations-Vorrat
  (dieselbe Bauart wie die WorkFlohs, `scanPfade()`).
- Erkannter Text → `PrueferMail`-KI-Muster (Auslieferungsprüfer) bzw. Modul 25
  (Sende-Prüfer). Befund `BILD-TEXT` / `BILD-KI-ANWEISUNG`, Stelle „Anhang x, Bildtext Zeile n".
- Lädt Tesseract nicht (offline, Webseite weg): **„Text im Bild ungeprüft"** —
  nie still „kein Befund".

## B · Fast unsichtbarer Text

Die übliche Art, einer KI etwas unterzuschieben, ist nicht Steganografie,
sondern **sichtbarer Text, den ein Mensch übersieht**: hellgrau auf weiß, 3 px
hoch, in einer Ecke. Eine Bild-KI liest ihn trotzdem.

- Dasselbe Bild zweimal lesen: normal und nach Kontrast-Spreizung
  (Histogramm je Kachel strecken). Was **nur** in der zweiten Lesung steht, ist
  der Befund `BILD-VERSTECKTER-TEXT`.
- Das ist die Lehre „zwei Fassungen, ein Ergebnis" (DOMParser gegen Regex im
  Auslieferungsprüfer): **der Unterschied ist der Befund.**

## C · Botschaft in den Bildpunkten (Steganografie)

**Ehrlich vorweg: auslesen lässt sich eine verschlüsselte Botschaft nicht, und
nicht jede Art ist erkennbar.** Was geht, ist ein **Verdacht mit Zahl**.

| Verfahren | erkennt | erkennt nicht |
|---|---|---|
| Chi-Quadrat-Angriff (Westfeld/Pfitzmann) auf Wertepaare | niederwertigstes Bit (LSB) ersetzt, fortlaufend | LSB-Matching (±1), verstreut und kurz |
| RS-Analyse (Fridrich) / Sample-Pair-Analyse | LSB-Ersetzen, schätzt die eingebettete Menge | dito |
| — | — | JPEG-Verfahren im DCT-Raum (F5, OutGuess, steghide auf JPEG) |

- Nur für **verlustfreie** Bilder (PNG, BMP, WebP-lossless); ein JPEG bekommt die
  benannte Grenze statt einer Zahl.
- Ergebnis heißt **„Verdacht"**, nie „gefunden": Befund `BILD-LSB-VERDACHT` mit
  geschätztem Anteil und dem Satz, dass auch ein bearbeitetes oder rauschendes
  Bild so aussehen kann.
- Reine Rechnung auf einem Pixelfeld → Node-prüfbar, gehört in
  `pruefer-anhang.js` (bzw. eine Schwesterdatei, falls sie zu groß wird).
- **Messplan, bevor es auf die Seite kommt:**
  - Fehlalarme an echten Fotos: die 17 aus `Workflow-PDF/tests/scan-fotos/`
    (verlustfrei nach PNG gewandelt) — Ziel **0 Verdacht**.
  - Treffer an denselben Fotos mit eingebetteter Botschaft (100 %, 50 %, 10 %
    der Kapazität, fortlaufend und verstreut) — die Zeile, ab der nichts mehr
    erkannt wird, **steht dann in der Doku**, nicht eine geratene.
  - Die Schwelle wird aus diesen Zahlen gesetzt, nicht vorher.

## D · PDF-Seitentext

- pdf.js liegt in `Workflow-PDF/vendor/pdfjs/` (1,5 MB) → nachladen wie A.
- `getTextContent()` je Seite → KI-Muster + Modul 25. Befund `PDF-KI-ANWEISUNG`,
  Stelle „Anhang x, Seite n".
- Gescannte Seiten ohne Textebene → weiter mit A.

## E · Unsichtbarer PDF-Text

- Je Seite: Textebene (D) gegen Texterkennung des **gerenderten** Bilds (A).
  Wörter, die in der Textebene stehen und im Bild nicht zu sehen sind →
  `PDF-VERSTECKTER-TEXT` (weiß auf weiß, Größe < 1 pt, außerhalb der MediaBox,
  Darstellungsart 3).
- Teuer: ein Tesseract-Lauf je Seite. Deckel nötig (z. B. erste 10 Seiten,
  benannt, wenn mehr).

## Reihenfolge (Vorschlag)

1. **D** — billig, pdf.js ist schnell, trifft den häufigsten Fall
2. **A**, dann **B** (baut auf A)
3. **E** (braucht A und D)
4. **C** — erst nach dem Messplan; ohne gemessene Fehlalarm-Zahl nicht auf die Seite

## Leitplanken

- Nichts davon wird ausgeführt oder angezeigt; gelesen wird auf dem Gerät.
- **An die KI geht weiterhin nur der Mailtext**, nie eine Datei.
- Ergebnisse nur über `textContent`.
- Nachgeladene Werkzeuge nicht in den Vorrat; ohne sie „ungeprüft", nie grün.
- `pruefer-anhang.js` nur im Auslieferungsprüfer ändern, dann kopieren und den
  SHA-Pin im Sende-Prüfer nachziehen (`tests/anhaenge.mjs`, `ANHANG_SHA`).
- Sende-Prüfer: die vier Dateien sind voll (98 230 / 98 304) — alles nach `assets/`.
- Jede neue Befundart bekommt Wächter + Gegenprobe-Fall mit Namen.

## Offene Fragen an Klaus

- Soll C (Steganografie) überhaupt einen Knopf bekommen, wenn die Zahl nur
  „Verdacht" sagen kann?
- Reicht es, PDFs über 10 Seiten nur teilweise gegenzulesen (E)?

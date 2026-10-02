# Brief · Beide Prüfer in drei Sprachen (DE · EN · RU) — und eine Stimme für den Auslieferungsprüfer

Geschrieben am 2026-10-02 gegen den Stand von `main` in **Sende-Pruefer** und
**Auslieferung-Pruefer**. Arbeitsdepots: beide.

## Klaus' Auftrag (2026-10-02, wörtlich)

> „den Sendeprüfer und den Auslieferungsprüfer … in drei Sprachen zu übersetzen,
> und zwar Deutsch, Englisch und Russisch. Das zweite ist, dieselbe sprachliche
> … Ausgabe wie beim Sendeprüfer für den Auslieferungsprüfer machen. Und zwar
> da, wo die Erklärungen sind dazu."

Zwei Aufgaben:

1. **Oberfläche übersetzen** — Sende-Prüfer und Auslieferungsprüfer auf DE · EN · RU.
2. **Gesprochene Erklärung** — das Handbuch mit Abspieler und aufgenommener
   Stimme, wie es im Sende-Prüfer steht, für den Auslieferungsprüfer bauen,
   „da, wo die Erklärungen sind".

## Stand (gemessen 2026-10-02, nicht angenommen)

| | Sende-Prüfer | Auslieferungsprüfer |
|---|---|---|
| Oberfläche | **nur Deutsch** (`sende-pruefer.html` `lang="de"`, keine Sprachschicht) | **DE · EN** über `assets/sprache.js` + `assets/i18n-pruefer.js` / `i18n-recht.js` (aus PWA-Toolpoint kopiert) |
| Startseite `start.html` | **nur Deutsch** | DE · EN über `data-l` |
| Handbuch mit Szenen | ✅ `handbuch.html`, gebaut aus `tools/handbuch-szenen.mjs` + `tools/handbuch-vorlage.html` | **gibt es nicht** |
| Stimme | ✅ DE (Amala), EN (Andrew), RU (Svetlana), Abspieler mit Regler, ⏮ ⏸/▶ ⏭ | — |
| Befundtexte (`pruefer-anhang.js`, `pruefer-mail.js`) | byte-1:1 aus dem Auslieferungsprüfer | **nur Deutsch** |

## Wichtige Fallen, bevor jemand anfängt

- **Die vier Dateien des Sende-Prüfers sind voll** (98 294 von 98 304 Bytes:
  `sende-pruefer.html`, `koeder.txt`, `LIESMICH.md`, `PROBE.md`, Grenze 96 KB).
  Eine Sprachschicht passt dort **nicht** hinein. Sie gehört nach `assets/`
  (wie `anhaenge.js`, `aussen.js`), die Seite trägt höchstens eine Zeile mehr.
  Am besten: `assets/sprache.js` aus dem Auslieferungsprüfer übernehmen, nicht
  neu erfinden (der Riegel gegen Chromes Auto-Übersetzer steckt darin).
- **Der Auslieferungsprüfer kennt zwei Sprachen**, die Wächter in
  `tests/smoke_knoten.mjs` (§ Wörterbuch) und `smoke_pruefer.mjs` prüfen DE/EN.
  Russisch heißt: jeder Schlüssel in `i18n-*.js` bekommt `ru`, und die Wächter
  „jeder Eintrag hat jede Sprache · keine Entität in textContent-Schlüsseln"
  müssen auf drei Sprachen erweitert werden — sonst entsteht die **halb
  übersetzte Tafel** (sieht russisch aus, streut deutsche Sätze ein).
- **Die Befundtexte** (`pruefer-anhang.js`, `pruefer-mail.js`) sind Kanon und
  byte-1:1 in den Sende-Prüfer kopiert (SHA-Pins). Wer sie übersetzt, ändert sie
  **im Auslieferungsprüfer**, kopiert hinüber und zieht die Pins nach.
  `pruefer-mail.js` hat einen **Python-Zwilling** (`werkzeuge/`) — Befundtexte dort
  nicht ändern, sondern in der Oberfläche übersetzen (Kennung → Text), sonst bricht
  „zwei Fassungen, ein Ergebnis".
- **Impressum und Datenschutz werden NICHT übersetzt** (Entscheidung aus
  PWA-Toolpoint, 2026-09-14): eine selbst gemachte Fassung eines Rechtstextes sähe
  verbindlich aus. Beide Seiten sagen das und nennen den Browser-Übersetzer.
- **Russisch braucht Schrift**: die Seiten laufen in Systemschrift, das ist
  unkritisch. Bilder des Handbuchs zeigen weiter die deutsche Oberfläche, bis
  neu fotografiert wird — benannte Grenze, wie heute beim englischen Handbuch.
- **Wer eine Sprache wählt, braucht die Wahl getrennt je App** (Speicher-Schlüssel
  app-eigen; `github.io` ist geteilt). Der Auslieferungsprüfer nutzt heute
  `toolpoint_lang` — das teilt er mit PWA-Toolpoint. Nachsehen, ob das gewollt ist.

## Aufgabe 2 — das Handbuch für den Auslieferungsprüfer

Vorbild ist der Sende-Prüfer, **kopiert, nicht neu erfunden**:

| Sende-Prüfer | Auslieferungsprüfer (neu) |
|---|---|
| `tools/handbuch-szenen.mjs` | Szenen für: Seite öffnen · Foto/Datei prüfen · PDF · Mail · Befundkarte · „Was jetzt tun" · Bildpunkte auf Verdacht · Testvorlagen |
| `tools/handbuch-vorlage.html` (Abspieler, Regler, ⏮ ⏸/▶ ⏭, Tastatur) | dieselbe Vorlage, Kopf und Farben angepasst |
| `tools/handbuch-bauen.mjs` | gleiches Werkzeug, Startseite = `auslieferungspruefer.html` |
| `tools/handbuch-ton.mjs` | **unverändert übernehmen** (Schnitt satzweise) |
| `?` in der Kopfleiste | in der Kopfleiste des Prüfers neben ⟳, und Link von `start.html` |

**„Da, wo die Erklärungen sind"** heißt: im Prüfer stehen Erklärungen heute an
der Startseite (`start.html`), im Zweck-Absatz (`pr_zweck`, `pr_wann_*`) und
in der Anleitung („Wann brauche ich das?"). Die erste Frage an Klaus:
**Soll das Handbuch eine eigene Seite werden (wie im Sende-Prüfer) oder sollen
die Abspiel-Knöpfe direkt an diesen Stellen stehen?**

**Die Stimme macht Klaus**, nicht die Sitzung: Sprechtexte schreiben (je Szene
DE, dann EN und RU — Klaus hat beim Sende-Prüfer die Texte selbst gekürzt und
übersetzt), ihm als Block in den Chat legen, er nimmt bei speechma auf (DE Amala,
EN Andrew, RU Svetlana — wie bisher), dann `node tools/handbuch-ton.mjs
<aufnahme.mp3> <spr>` und neu bauen. **Der Schnitt misst die Lage, nicht den
Wortlaut** — Klaus' Ohr bestätigt.

## Reihenfolge (Vorschlag)

1. Klaus fragen: eigene Handbuch-Seite oder Knöpfe an Ort und Stelle? Sprachwahl
   je App oder gemeinsam?
2. Auslieferungsprüfer: `ru` in alle Wörterbücher, Wächter auf drei Sprachen.
3. Sende-Prüfer: Sprachschicht aus dem Auslieferungsprüfer übernehmen (in
   `assets/`), Wörterbuch DE/EN/RU, Wächter.
4. Handbuch für den Auslieferungsprüfer: Szenen, Bilder, Sprechtexte DE → Klaus.
5. Aufnahmen schneiden, einbauen, EN/RU.

## Prüfen (in beiden Depots)

```bash
npm install && npm test
cp -a . ../kopie && cd ../kopie && bash tests/gegenprobe.sh   # NUR in einer Kopie, nach einem Commit
```

⚠ Der Auslieferungsprüfer kennt `NUR_ANKER` **nicht** — dort startet ein
`NUR_ANKER=1 bash tests/gegenprobe.sh` einen vollen Lauf.
⚠ `pkill -f "<muster>"` trifft die eigene Hülle mit — PID holen und die töten.

## Pflicht am Ende

Abschlussbrief mit gemessenem Stundennachweis (Reflog-Beginn bis letzter
Merge), Forschungseintrag in Kimhub (`node tools/sitzung-eintragen.mjs`,
`arm` ist Pflicht), Brief für die nächste Sitzung als Codeblock im Chat.

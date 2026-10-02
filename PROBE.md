# PROBE — Selbsttest des Sende-Prüfers

**Gefahren:** 2026-10-02, 17:55 UTC · headless Chromium 141 (Playwright), Linux x86_64 · über ⚙ → „Selbsttest starten“, gesteuert von `tests/smoke.mjs`.

**Ergebnis: 23 von 23 bestanden.**

```
✓ der Köder ist geladen (1269 Zeichen, 51 Zeilen)
✓ Zeile 9: NAME genau einmal (gemeldet: NAME)
✓ Zeile 12: MAIL genau einmal (gemeldet: MAIL)
✓ Zeile 15: TELEFON genau einmal (gemeldet: TELEFON)
✓ Zeile 18: kein Befund erwartet, gemeldet 0
✓ Zeile 21: IBAN genau einmal (gemeldet: IBAN)
✓ Zeile 24: kein Befund erwartet, gemeldet 0
✓ Zeile 27: BETRAG genau einmal (gemeldet: BETRAG)
✓ Zeile 30: BETRAG genau einmal (gemeldet: BETRAG)
✓ Zeile 33: BETRAG genau einmal (gemeldet: BETRAG)
✓ Zeile 36: RECHNUNG genau einmal (gemeldet: RECHNUNG)
✓ Zeile 39: RECHNUNG genau einmal (gemeldet: RECHNUNG)
✓ Zeile 42: SCHLUESSEL genau einmal (gemeldet: SCHLUESSEL)
✓ Zeile 45: DATUM genau einmal (gemeldet: DATUM)
✓ Zeile 48: kein Befund erwartet, gemeldet 0
✓ es gab Marken zu prüfen (14)
✓ außerhalb der Marken nichts gemeldet (0)
✓ Kopfzahl 11 = gemeldet 11
✓ die verdeckte Fassung enthält keinen der 11 Werte
✓ hin und zurück ergibt Zeichen für Zeichen den Köder
✓ 3 Beträge ganz verdeckt, keine Ziffer und kein Punkt daneben stehen geblieben
✓ derselbe Wert trägt überall denselben Platzhalter
✓ ohne Namen-Liste wird kein Name gemeldet
```

Die ersten zwei Vorbedingungen sind der Grund, warum die übrigen etwas bedeuten: der Köder war wirklich geladen (1269 Zeichen), und es gab wirklich Marken zu prüfen (14). Bei 0 Zeichen oder 0 Marken wäre ein grünes Ergebnis ein grünes Nichts.

## Was damit NICHT gemessen ist

- **Ein Tablet, ein echter Nutzer.** Headless beweist die Logik, nicht wie es sich am Gerät anfühlt. Klaus' Sichttest steht aus.
- **Ein echter Senden-Aufruf.** Die Probe fängt jeden Anbieter ab (`page.route`). Echt gesendet ist nur mit Claude an Klaus' Tablet.
- **Ein echter Text aus dem Alltag.** Der Tausenderpunkt-Fehler ist am 2026-09-21 an einem Text aufgefallen, den kein Köder enthielt. Der nächste solche Fund kommt wieder aus einem echten Text.

Wer den Selbsttest am eigenen Gerät fährt, trägt das Ergebnis hier ein, mit Browser und Datum.

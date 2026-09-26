# Sende-Prüfer — Anleitung

Der Sende-Prüfer sorgt dafür, dass die Namen, Nummern und Beträge Ihrer Kunden nicht beim KI-Anbieter landen, wenn Sie eine KI um Hilfe bitten. Sie stellen Ihre Frage in der Seite, die Seite ersetzt jede solche Angabe durch einen Platzhalter, und die Antwort bekommen Sie mit den echten Angaben zurück.

## Wann man dazu greift

**1 · Eine Antwort an eine Kundin formulieren lassen.** Sie haben eine verärgerte Mail samt Rechnungsnummer, Betrag und Telefonnummer vor sich und wollen einen freundlichen Entwurf. Ohne den Sende-Prüfer lägen diese Angaben danach auf dem Server des Anbieters, im Verlauf Ihres Kontos und womöglich in dessen Protokollen.

**2 · Eine Tabelle oder einen Export erklären lassen.** Sie fügen eine CSV aus der Buchhaltung ein und fragen, warum eine Summe nicht stimmt. Mitten darin stehen Kontonummern und Mailadressen, die mit der Frage nichts zu tun haben. Wenn sie hinausgehen, ist das ein Datenabfluss, den Sie nicht wollten und niemandem erklären können.

## So geht es

1. Text in **Feld 1** schreiben oder einfügen, alternativ eine Text-Datei wählen.
2. Die **Namen** der beteiligten Personen und Firmen darunter eintragen.
3. **Feld 2** zeigt, was gefunden wurde, mit Zeile und Sorte. **Feld 3** zeigt genau den Text, der hinausgeht.
4. Einen der beiden Wege wählen:
   - **Kopieren**, für Ihr eigenes KI-Abo: einfügen, wo Sie ohnehin arbeiten, ohne Schlüssel und ohne zusätzliche Kosten. Die Antwort fügen Sie danach in das Feld darunter ein.
   - **Senden**, ohne Fenster zu wechseln. Sie wählen den Anbieter und tragen Ihren Schlüssel ein. Es kostet, was Ihr Schlüssel kostet.
5. **Feld 5** zeigt die Antwort mit Ihren echten Angaben.

## Was erkannt wird

| Sorte | Beispiel |
|---|---|
| SCHLUESSEL | `sk-ant-…`, `ghp_…`, `AKIA…`, private Schlüssel, `password = …` |
| MAIL | `name@firma.de` |
| TELEFON | nur mit Ländervorwahl oder `tel:` — `+49 30 …` |
| IBAN | nur mit stimmender Prüfziffer |
| BETRAG | `89,90 €`, `1.248,50 EUR`, `EUR 1.234.567,89` — auch mit Tausenderpunkt ganz |
| RECHNUNG | `Rechnungsnummer: …`, `Kundennummer: …`, freistehend `RE-2026-04871` |
| NAME | nur die Namen aus Ihrer Liste |

## Grenzen — was die Seite nicht kann

1. **Namen findet sie nicht selbst.** Ein Muster unterscheidet „Müller“ die Person nicht von „Müller-Thurgau“ der Rebsorte. Verdeckt werden nur die Namen, die Sie eintragen. Ein vergessener Name geht hinaus.
2. **Was kein Muster hat, erkennt sie nicht:** Adressen, Geburtsdaten, Kennzeichen, Gesundheitsangaben, Beschreibungen, an denen man jemanden erkennt („die Filialleiterin in Kiel“). Lesen Sie Feld 3, bevor Sie senden.
3. **Eine Telefonnummer ohne Ländervorwahl bleibt stehen**, weil eine bloße Ziffernfolge meist eine Kennung oder ein Datum ist. Wer `030 1234567` verdecken will, schreibt `+49 30 1234567` oder trägt die Nummer in die Namen-Liste ein.
4. **Rechnungsnummern erkennt sie nur mit Feldname** oder in der Form `RE-/RG-/INV-/KD-/AN-Jahr-Nummer`. Eine Nummer wie `A17/33` im Fließtext bleibt stehen.
5. **Die KI kann aus dem Zusammenhang raten.** Platzhalter verbergen den Wert, nicht die Lage: „die einzige Bäckerei am Marktplatz“ ist auch ohne Namen erkennbar.
6. **Bilder und PDF liest die Seite nicht.** Nur Text; ein eingefügtes Foto einer Rechnung wird nicht geprüft.
7. **Die Muster stehen zweimal:** im Auslieferungsprüfer (`pruefe-datei.py` und die Browser-Fassung) und hier. Wer eines ändert, zieht das andere nach. Beträge mit Tausenderpunkt werden hier schon ganz erfasst, dort noch nicht.
8. **Die Anbieter-Adressen stammen aus dem Auftrag**, nicht aus einem Aufruf, den diese Seite gemacht hat. Ob der erste Senden-Aufruf durchgeht, zeigt erst ein echter Schlüssel.
9. **Der Schlüssel liegt im Browser-Speicher** dieses Geräts. Wer das Gerät teilt, löscht ihn nach Gebrauch mit „Schlüssel löschen“.

## Selbsttest

Unten auf der Seite: **Selbsttest starten**. Der Köder `koeder.txt` enthält jede Sorte genau einmal, drei Beträge und drei Zeilen, die nicht gemeldet werden dürfen. Geprüft wird auch, dass der Köder überhaupt geladen wurde und es Marken zu prüfen gab; bei 0 Zeichen oder 0 Marken wäre ein grünes Ergebnis ein grünes Nichts. Wer die Seite als Datei öffnet, wählt `koeder.txt` von Hand, weil der Browser das Nachladen dort sperrt.

Das zuletzt gemessene Ergebnis steht in `PROBE.md`.

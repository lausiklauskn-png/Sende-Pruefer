# Sende-Prüfer — Anleitung

Der Sende-Prüfer ist ein kleines Postfach, das dafür sorgt, dass die Namen, Nummern und Beträge Ihrer Kunden nicht beim KI-Anbieter landen, wenn Sie eine KI um Hilfe bei einer E-Mail bitten. Jede Angabe wird durch einen Platzhalter ersetzt, und die Antwort bekommen Sie mit den echten Angaben zurück. Ihre Mails bleiben auf diesem Gerät.

## Wann man dazu greift

**1 · Eine Antwort an eine Kundin formulieren lassen.** Sie haben eine verärgerte Mail samt Rechnungsnummer, Betrag und Telefonnummer vor sich und wollen einen freundlichen Entwurf. Ohne den Sende-Prüfer lägen diese Angaben danach auf dem Server des Anbieters, im Verlauf Ihres Kontos und womöglich in dessen Protokollen.

**2 · Einen eigenen Entwurf glätten lassen.** Sie schreiben einem Lieferanten eine neue Lieferadresse samt Telefonnummer und wollen den Ton verbessern lassen. Die Adresse und die Nummer haben mit dem Ton nichts zu tun; wenn sie hinausgehen, ist das ein Datenabfluss, den Sie nicht wollten und niemandem erklären können.

## So geht es

1. **📥 Mail einfügen:** eine empfangene Mail samt Kopfzeilen (Von, An, Betreff) aus Ihrem Mail-Programm hineinkopieren oder eine gespeicherte `.eml` öffnen. Sie landet in **Eingefügt**. Oder **Verfassen** für einen eigenen Entwurf (Ordner **Entwürfe**).
2. Die Namen aus Von und An werden von selbst verdeckt. Weitere Personen- und Firmennamen tragen Sie unter **„Weitere Namen“** ein.
3. **Original** zeigt die Mail mit jedem Fund markiert, **Was die KI sieht** zeigt genau den Text, der hinausgeht: Ihre Mail, darunter Ihre Bitte, jede Angabe als Platzhalter.
4. **✦ Mit KI beantworten** (bzw. überarbeiten). Unter **„Was soll die KI tun?“** eine Aufgabe antippen (Antwort, Rechnung, Mahnung, Angebot …) oder selbst eintragen und **Anweisung bauen**; daraus entsteht die ganze Anweisung, frei änderbar. **Als Knopf merken** legt eine eigene Aufgabe als Knopf an. Dann einen der beiden Wege wählen:
   - **Kopieren**, für Ihr eigenes KI-Abo: einfügen, wo Sie ohnehin arbeiten, ohne Schlüssel und ohne zusätzliche Kosten. Die Antwort fügen Sie danach in das Feld darunter ein.
   - **Senden**, ohne Fenster zu wechseln. Sie wählen den Anbieter und tragen Ihren Schlüssel ein; einen Schlüssel erzeugen Sie über den Link „🔑 Schlüssel beim Anbieter erzeugen“. Mit „🔒 Im Tresor ablegen“ und einem Code wird er verschlossen aufgehoben; danach genügt der Code. Es kostet, was Ihr Schlüssel kostet.
5. Die Antwort steht mit Ihren echten Angaben da. **In KI-Antworten ablegen**, **⤓ Als .eml speichern** oder **📤 Teilen**: die `.eml` öffnet Ihr Mail-Programm als Entwurf; Teilen gibt Betreff und Text an ein Programm Ihrer Wahl (den Empfänger tragen Sie dort ein). Gespeicherte und geteilte Mails liegen danach in **Exportiert**.

Unter **⚙** stehen die Beispiel-Mail und der Selbsttest. Oben schaltet **☀ Hell** bzw. **🌙 Dunkel** das Thema um; die Wahl bleibt gemerkt.

**🛡 Abschirmen** hält Schreib-Helfer (Grammarly, LanguageTool) und die KI-Schreibhilfe des Browsers von den Schreibfeldern fern: Rechtschreibprüfung, Autokorrektur und Schreibvorschläge gehen aus, auch in Feldern, die später aufgehen. Ein zweiter Tipp stellt alles wieder her. Hängt etwas Fremdes Elemente oder Marken in die Seite, erscheint oben ein roter Hinweis, und die Lampe **fremd** leuchtet.

Oben neben dem Namen steht die **Netz-Leiste**: drei Lampen (**lebt** · **verkehr** · **fremd**), das **Siegel** und die **Mycel-Blase**. Am Handy stehen dort nur die drei Punkte; ein Tipp klappt Namen, Siegel und Blase auf. Der Sende-Prüfer ist damit ein eigener Knoten im SBKIM-Netz. Mit dem Netz verbindet er sich nur, wenn Sie in der Mycel-Blase darauf tippen.

Das Postfach füllt immer das ganze Fenster. Als installierte App öffnet es sich am Rechner in einem eigenen Fenster mit **—** (verkleinern), **⧉** (Größe ändern) und **✕** (schließen); die Größe merkt sich der Browser. Einmal auf volle Größe gestellt, startet es danach so.

## Was erkannt wird

| Sorte | Beispiel |
|---|---|
| SCHLUESSEL | `sk-ant-…`, `ghp_…`, `AKIA…`, private Schlüssel, `password = …` |
| MAIL | `name@firma.de` |
| TELEFON | nur mit Ländervorwahl oder `tel:` — `+49 30 …` |
| IBAN | nur mit stimmender Prüfziffer |
| BETRAG | `89,90 €`, `1.248,50 EUR`, `EUR 1.234.567,89` — auch mit Tausenderpunkt ganz |
| RECHNUNG | `Rechnungsnummer: …`, `Kundennummer: …`, freistehend `RE-2026-04871` |
| NAME | die Namen aus Von und An und aus Ihrer Liste |

## Grenzen — was die Seite nicht kann

1. **Namen findet sie nicht selbst.** Ein Muster unterscheidet „Müller“ die Person nicht von „Müller-Thurgau“ der Rebsorte. Verdeckt werden die Namen aus Von und An und die, die Sie eintragen. Ein vergessener Name geht hinaus.
2. **Was kein Muster hat, erkennt sie nicht:** Adressen, Geburtsdaten, Kennzeichen, Gesundheitsangaben, Beschreibungen, an denen man jemanden erkennt („die Filialleiterin in Kiel“). Lesen Sie „Was die KI sieht“, bevor Sie senden.
3. **Eine Telefonnummer ohne Ländervorwahl bleibt stehen**, weil eine bloße Ziffernfolge meist eine Kennung oder ein Datum ist. Wer `030 1234567` verdecken will, schreibt `+49 30 1234567` oder trägt die Nummer unter „Weitere Namen“ ein.
4. **Rechnungsnummern erkennt sie nur mit Feldname** oder in der Form `RE-/RG-/INV-/KD-/AN-Jahr-Nummer`. Eine Nummer wie `A17/33` im Fließtext bleibt stehen.
5. **Die KI kann aus dem Zusammenhang raten.** Platzhalter verbergen den Wert, nicht die Lage: „die einzige Bäckerei am Marktplatz“ ist auch ohne Namen erkennbar.
6. **Anhänge prüft die Seite (noch) nicht.** Nur der Text einer Mail; Bilder, PDF und Office-Dateien einer `.eml` werden nicht gelesen. Das ist der nächste Bauschritt. Auch dann: der Sende-Prüfer ist **kein Virenscanner**.
7. **Die Muster stehen zweimal:** in Sage-Modul 25 (`modules/25_pseudonym.js`, von dort unverändert übernommen) und im Auslieferungsprüfer. Fehlt die Datei `modules/25_pseudonym.js`, sagt die Seite das und lässt nichts hinaus.
8. **Die Anbieter-Adressen stammen aus dem Auftrag**, nicht aus einem Aufruf, den diese Seite gemacht hat. Ob der erste Senden-Aufruf durchgeht, zeigt erst ein echter Schlüssel.
9. **Mails und Zuordnung liegen im Browser-Speicher** dieses Geräts, der Schlüssel nur verschlossen (AES-256, 600 000 Runden). Einen kurzen Code kann durchprobieren, wer die Ablage kopiert. Wer Browserdaten löscht, löscht auch das Postfach. Wer das Gerät teilt, löscht den Schlüssel nach Gebrauch mit „Schlüssel löschen“ und die Mails mit 🗑.
10. **Eine eingefügte Mail wird nur als Text gelesen.** Aus einer HTML-Mail bleibt der Text ohne Gestaltung; Kopfzeilen außer Von, An und Betreff fallen weg.
11. **Die Abschirmung ist eine Bitte, kein Riegel.** Eine Erweiterung darf die Marken übergehen, und Programme auf dem Gerät, die Bildschirm oder Zwischenablage mitlesen, sieht eine Webseite gar nicht. Gemeldet wird nur, was sich in der Seite zeigt.
12. **Mit dem Netz verbinden schickt etwas hinaus:** die signierte Visitenkarte des Knotens (Name, Kennung, Beschreibung) an das Relais `relay.family-projekt.de` — keine Mails, keine Namen, keine Befunde. Ohne Tipp in der Mycel-Blase geht nichts hinaus. Das Siegel lädt beim Signieren einmal ein Sprachmodell aus dem Netz.

## Selbsttest

Unter **⚙ → Selbsttest starten**. Der Köder `koeder.txt` enthält jede Sorte genau einmal, drei Beträge und drei Zeilen, die nicht gemeldet werden dürfen. Geprüft wird auch, dass der Köder überhaupt geladen wurde und es Marken zu prüfen gab; bei 0 Zeichen oder 0 Marken wäre ein grünes Ergebnis ein grünes Nichts. Wer die Seite als Datei öffnet, wählt `koeder.txt` von Hand, weil der Browser das Nachladen dort sperrt.

Das zuletzt gemessene Ergebnis steht in `PROBE.md`.

# Brief · Startseite „Was die App kann" für Sende-Prüfer und Auslieferungsprüfer

Stand 2026-10-01. Gegen `origin/main` geschrieben (Sende-Pruefer nach #41, Auslieferung-Pruefer
nach #23, Kimhub nach #306).

## Klaus' Auftrag, wörtlich gekürzt

> „… eine Startseite …, die einen Überblick über die Funktionsweise der App, Auslieferungs-App und
> der Sende-App gibt. Mit Bildern, mit Erklärungen, warum nützlich, welche Gefahren bei
> Dateianhängen bestehen, wie raffiniert Gauner vorgehen können und wie die App dabei hilft …
> Lösungsvorschläge — darüber müssen wir noch nachdenken … so ähnlich wie bei BookLedgerPro …
> Bilder aus der App … Vollbildansicht vom Sendeprüfer, der aussieht wie ein E-Mail-Postfach …
> genauso der Auslieferungsprüfer, was seine Aufgabe ist, was das Besondere ist …
> Handlungsempfehlungen … was tue ich, wenn ein Bild mit einem KI-Befehl kommt … was als nächstes
> geplant ist … als erste Seite, beim zweiten Mal weglassen, und in der App oben wieder aufrufbar …
> Weil wenn ich den Nutzen nicht erkenne, dann würde ich die App nicht nutzen."

## Was gebaut werden soll

1. **Eine Startseite je App** (Sende-Prüfer und Auslieferungsprüfer), die beim ersten Öffnen
   **vor** der App steht. Sie zeigt zuerst den **Nutzen** und erst danach die Bedienung.
2. Inhalt, in dieser Reihenfolge:
   - **Wofür** (ein Satz, zwei Alltagsfälle mit dem Schaden, den sie abwenden),
   - **Die Gefahren**: was in Mails und Anhängen steckt und wie Gauner vorgehen,
   - **Wie die App hilft**: Bilder aus der echten App,
   - **Was tun, wenn …**: Handlungsempfehlungen je Befundart,
   - **Grenzen**: was die App nicht kann,
   - **Was als Nächstes kommt**.
3. **Die Schwester-App kommt vor.** Jede Startseite stellt die andere App kurz vor und verlinkt
   sie; die beiden gehören zusammen (Klaus 2026-09-17: „später in EINER App").
4. **Anzeige-Regel** (BookLedgerPro ist dafür NUR Vorbild, siehe unten):
   - beim ersten Öffnen zeigen;
   - Haken „Beim nächsten Mal nicht mehr zeigen";
   - oben in der Kopfleiste jederzeit wieder aufrufbar;
   - der Knopf muss etwas anderes sein als das Handbuch „?". Vorschlag: „ℹ Überblick". Das
     Handbuch bleibt die Gebrauchsanleitung, die Startseite ist der Überblick.

## Ton und Gestalt — eine Werbung, kein Datenblatt (Klaus 2026-10-01)

> „BookLedgerPro ist nur das Vorbild, weil die Seite vor dem Code läuft. … Es sollte ein bisschen
> interessanter sein als diese Seite von BookLedgerPro. Es sollte schön zu lesen sein und wirklich
> eher eine Werbung für das Produkt sein, aber auch deutlich zeigen, was die Möglichkeiten sind,
> warum ich daran gearbeitet habe, was das Ganze für einen Sinn haben soll."

- **Von BookLedgerPro übernommen wird nur die Stellung:** eine Seite, die vor der App steht.
  Dort ist es ein nüchternes Deckblatt vor dem Passwort (`src/ui/intro.js`). Gestaltung, Aufbau
  und Ton werden nicht übernommen.
- **Aufbau wie eine Produktseite:** ein großer Einstieg mit dem Kernsatz und dem Bild der App
  (Sende-Prüfer: das Postfach im Vollbild; das Schild-Icon mit Lichtschein gibt es schon),
  danach Abschnitte, die beim Scrollen kommen, mit Bildern, kurzen Sätzen und einem klaren Knopf
  „Jetzt ausprobieren". Das Handbuch zeigt, wie bereits gebaute Szenen, Leuchtringe und
  Sprechtexte aussehen; daran lässt sich anknüpfen.
- **Ein Abschnitt „Warum es das gibt":** Klaus' Beweggrund in seinen eigenen Worten. **Nicht
  erfinden:** die Sitzung fragt ihn danach oder zeigt einen Entwurf zur Freigabe.
- **Werbend, aber ehrlich:** jede Fähigkeit, die dort steht, ist gebaut und gemessen. Was nur
  geplant ist, steht unter „Als Nächstes". Keine Zahl ohne Messung, kein „100 % sicher", und
  die Grenzen stehen sichtbar dabei (das ist hier Teil des Versprechens).
- Schnell trotz Bildern: Bilder mit `loading="lazy"` und festen Maßen (kein Layout-Sprung),
  bei „weniger Bewegung" keine Bewegung. Die Regeln dazu stehen im Skill `seiten-bauregeln`.

## Die Texte: neu geschrieben, für Leser (Klaus 2026-10-01)

> „Schreibe nicht einfach die Kommentare und die Aussagen, die wir hier in der Sitzung gemacht
> haben … es soll so sein, als wenn es nicht aus einer Sitzung stammt, in der wir miteinander
> gesprochen haben."

- **Jeder Satz ist neu geschrieben**, für jemanden, der die App zum ersten Mal öffnet. Nichts
  wird aus CLAUDE.md, Briefen, Commit-Texten, Code-Kommentaren oder dem Chat übernommen, auch
  nicht leicht umformuliert. Diese Quellen dienen nur als Sachstand: was die App kann und wo
  ihre Grenzen liegen.
- **Kein Werkstatt-Jargon:** nicht „Probe", „Gegenprobe", „Wächter", „gemessen am …", „grün/rot",
  „Befund" im Sinn einer Sitzung, „Tafel", „Riegel", „byte-1:1", Modulnummern, Commit- oder
  PR-Nummern. Auch keine Zitate von Klaus aus Sitzungen und kein „wir haben festgestellt …".
- **Stattdessen die Sprache des Lesers:** was passiert, was er davon hat, was er tun soll. Zum
  Beispiel „Die App liest den Text im Bild und warnt, wenn darin eine Anweisung an eine KI
  versteckt ist" statt „`BILD-KI-ANWEISUNG` wird gemeldet, gemessen an Vorlage 1A".
- **Ehrlich bleibt es trotzdem:** Grenzen stehen in klaren Worten da („Die App ersetzt keinen
  Virenscanner."), nicht als Messprotokoll.
- **Der Abschnitt „Warum es das gibt"** ist Klaus' Stimme, nicht die der Sitzung. Er wird mit
  ihm formuliert, nicht aus seinen Sitzungs-Aussagen zusammengesetzt.
- **Keine Regeln wiedergeben** (Klaus 2026-10-01: „Du musst nicht deine Regeln wiederholen …
  Ich glaube, es interessiert niemanden."): nicht erklären, nach welchen Grundsätzen gebaut,
  geprüft oder entschieden wurde („nichts wird geraten", „fail-soft", „ehrlich statt …"). Wer die
  Seite liest, will vier Dinge wissen: **was die App kann · wozu sie nützt · wie man sie benutzt ·
  was man tut, wenn sie ein Problem findet.** Das Vierte hat das größte Gewicht: zu jedem Fund
  klare Schritte in der Reihenfolge, in der man sie ausführt.
- **Prüfstein:** Klingt der Satz, als stünde er auf der Seite eines fertigen Produkts, oder als
  käme er aus einem Arbeitsprotokoll? Im zweiten Fall wird er neu geschrieben.

## Material, das es schon gibt (nicht neu erfinden)

| | wo |
|---|---|
| Bilder des Postfachs (gebaut, nicht von Hand) | `Sende-Pruefer/handbuch/*.jpg`, Bau: `node tools/handbuch-bauen.mjs` |
| Bild mit versteckter KI-Anweisung · blasse Anweisung | `Sende-Pruefer/tests/bild-mit-anweisung.png`, `tests/bild-blass.png` (erfunden) |
| Anhang-Muster (Makro, EXIF/GPS, Daten hinter Bildende, Programm mit falscher Endung, SVG mit Skript) | `tests/anhang-muster.mjs` in beiden Depots |
| Befundarten samt Rat | `Auslieferung-Pruefer/assets/pruefer-anhang.js`, `pruefer-mail.js`, `pruefer-formate.js` |
| Köder-Mail mit allen Angaben (Schlüssel, IBAN, Betrag …) | `Sende-Pruefer/koeder.txt` |
| Grenzen | `Sende-Pruefer/LIESMICH.md` → `anleitung.html` |
| Plan Stufe 2 (A/B/D gebaut, E und C offen) | `docs/BRIEF_2026-09-29_anhaenge-stufe2.md` |

## Die Beispiele, die getestet sind (für „Was tun, wenn …")

- Bild mit Anweisung an eine KI (`BILD-KI-ANWEISUNG`), auch blass.
- PDF mit versteckter Anweisung im Seitentext (`PDF-KI-ANWEISUNG`).
- Absender passt nicht, weitergeleitete Mail, unsichtbare Zeichen (Mail-Eingang).
- Anhang: Programm hinter harmloser Endung, Makro in Office, externer Verweis, EXIF-GPS im Foto,
  Daten hinter dem Bildende, SVG mit Skript.
- Sende-Richtung: Schlüssel, IBAN, Betrag, Namen gehen verdeckt hinaus; die Antwort kommt im
  Klartext zurück.
- .eml ist ein Paket für ein Mail-Programm. Teilen sagt vorher, welche Anhänge der Browser
  annimmt (#41).

## Offen — erst mit Klaus besprechen, NICHT raten

1. **Lösungsvorschläge.** Klaus: „Darüber müssen wir noch nachdenken." Die Sitzung legt je
   Befundart **einen Vorschlag zur Abstimmung** vor (Tabelle: Befund · was es bedeutet · was
   man tut · was die App schon anbietet, z. B. 🧼 sichere Fassung). Gebaut wird erst nach seinem
   Wort. Kein Rat, der am Tablet nicht ausführbar ist (NETZWEIT § 6b).
2. **Eine gemeinsame Seite oder zwei eigene?** Vorschlag: zwei Seiten aus EINER Quelle
   (Baustein-Datei, byte-1:1 in beide Depots, SHA-gepinnt), jede mit ihrer App vorn.
3. **Die Gauner-Beispiele**: erfunden, mit `.example`-Adressen. Keine echten Mails von Klaus.
   Welche Maschen genannt werden (z. B. falsche Rechnung mit neuer IBAN, KI-Anweisung in einem
   Bewerbungs-PDF, Foto mit Standort), stimmt die Sitzung mit ihm ab.
4. **„Was als Nächstes"**: E (Gegenlesen, höchstens 10 Seiten), C (Bildpunkte mit „Verdacht"),
   die beiden Apps zusammenführen. Nur nennen, was wirklich geplant ist.

## Was dabei leicht kaputtgeht

- **Sende-Pruefer: die vier Dateien liegen bei 98 230 von 98 304 Bytes.** Die Startseite ist
  eine **eigene Datei** (`start.html` o. ä.) samt `assets/`. In `sende-pruefer.html` kommt nur
  der Knopf plus der Sprung beim ersten Öffnen; dafür vorher Platz schaffen (Kommentare kürzen,
  ohne Satz zu streichen).
- **Speicher-Schlüssel app-eigen** (`sendepruefer_start_v1`, `auslieferungspruefer_start_v1`);
  `github.io` ist geteilt. Mit try/catch: ohne Speicher erscheint die Seite eben jedes Mal.
- **Ohne JavaScript** muss die Startseite lesbar sein, und der Weg zur App muss ein echter Link sein.
- **Bilder gebaut, nicht von Hand**: aus dem Handbuch-Werkzeug übernehmen oder erweitern. Wer die
  Oberfläche ändert, baut neu.
- **Cache-Bump** in beiden `sw.js`; die Startseite gehört in den Vorrat, Bilder nicht zwingend.
- **Auslieferungsprüfer: Deutsch/Englisch über `sprache.js`** — jeder Satz braucht beide Sprachen,
  und kein Entity in `data-i18n`-Einträgen (Wächter in `smoke_knoten.mjs`).
- Kein PII, keine echten Angaben in Beispielen. Impressum und Datenschutz bleiben mit echten
  Angaben.

## Akzeptanz

- Erstes Öffnen: die Startseite steht vor der App. Mit Haken erscheint sie beim zweiten Öffnen
  nicht mehr, ohne Haken wieder.
- Aus der Kopfleiste jederzeit erreichbar, in beiden Apps.
- Jede Behauptung über eine Fähigkeit entspricht einem Wächter, der sie misst (Probe liest die
  Seite, Gegenprobe-Fälle `START:`).
- Bei 360 px keine Querlauf-Breite; Bilder mit `alt`.
- Klaus' Sichttest am Tablet ist nicht ersetzbar: Adresse im Chat hinlegen.

## Reihenfolge

1. Frisch von `origin/main` in **beiden** Depots; `CLAUDE.md` beider lesen.
2. Gliederung, einen Entwurf des Einstiegs (Kernsatz, Bild), den Abschnitt „Warum es das gibt“ und die Tabelle der Lösungsvorschläge **an Klaus zeigen** (Plan vor Code). Gern als Vorschau (Artifact) zum Antippen.
3. Nach seinem Wort: Sende-Prüfer zuerst (hat die meisten Bilder), dann Auslieferungsprüfer.
4. Proben, Gegenprobe in Wegwerf-Kopie, Merge, Forschungseintrag in Kimhub, Stundennachweis.

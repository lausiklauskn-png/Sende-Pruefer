# Sende-Prüfer — Sitzungs-Anker

Eine Seite, die einen Text prüft, **bevor** er an eine KI geht: Schlüssel,
Mailadressen, Telefonnummern, IBANs, Beträge, Rechnungsnummern und Namen werden
durch Platzhalter ersetzt, die Antwort kommt im Klartext zurück. Kein
Build-Schritt, läuft im Browser, auch direkt als Datei geöffnet.

Adresse: https://lausiklauskn-png.github.io/Sende-Pruefer/

## Herkunft

Gebaut am 2026-09-26 nach dem Auftrag `Kimhub/auftraege/sende-pruefer.json`
(Prüfmerkmale 1–10). Die Fassungen der Werkstatt-Schichten liegen nur auf Klaus'
Gerät (`werkstatt/entwurf/`, gitignoriert) und in keinem Depot. Deshalb wurde
**neu gebaut, nicht übernommen**. Die Muster kommen aus dem Auslieferungsprüfer
(`pruefe-datei.py` · `pruefer-formate.js`). Wer dort eines ändert, zieht es hier
nach (benannte Doppelung, LIESMICH Grenze 7).

## Prüfen

```bash
npm install         # playwright-core
npm test            # tests/smoke.mjs — echter Browser, 48 Zusicherungen
npm run gegenprobe  # 14 eingebaute Fehler, jeder muss seine rote Zeile werfen
```

Zuletzt gemessen (2026-09-26): **48 grün · 0 ROT** · Gegenprobe **14 gefangen ·
0 blind · 0 aus falschem Grund · 0 tote Anker**. Ein Fall war zuerst blind: das
Raster am Handy hält zwei Riegel (`minmax` und `overflow-wrap`), und nur beide
zusammen wegzunehmen misst etwas.

## Was hier leicht kaputtgeht

- **Die vier Dateien** (`sende-pruefer.html`, `koeder.txt`, `LIESMICH.md`,
  `PROBE.md`) müssen **zusammen unter 48 KB** bleiben — die Probe misst es.
- **Die Anbieter stehen NUR in `ANBIETER`.** Ein freies Adressfeld ist die
  Hintertür durch die ganze Seite; die Probe besteht darauf, dass es keins gibt
  und dass jede API-Adresse im Code in der Konstante steht.
- **Zwei Protokolle:** Anthropic (Messages) und Mistral (OpenAI-Form) — zwei
  Anfrage- und zwei Antwortformen. Nicht nur die Adresse tauschen.
- **Modell-Vorgabe `claude-opus-5`**, aus der Anbieter-Liste des Auftrags. Im
  Zieltext des Auftrags stand `claude-haiku-4-5`. Gewählt ist die Liste, weil sie
  das Datum trägt; Klaus kann das in einer Zeile ändern.
- **Der Köder** trägt `# BEFUNDE: <Zahl>` im Kopf. Wer einen Fall ergänzt, zieht
  die Zahl nach, sonst wird der Selbsttest zu Recht rot.
- **Cache-Bump:** `CACHE_VERSION` in `sw.js`, wenn eine Datei aus `CORE` sich ändert.
- **Speicher-Schlüssel app-eigen:** `sendepruefer_key_<anbieter>` —
  `github.io` ist eine geteilte Adresse.

## Netzweit

Freibrief zum Selbst-Mergen · frisch von `origin/main` · Ton · kein PII ·
Ehrlichkeit: [Sage-Protokol/docs/NETZWEIT.md](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)

#!/usr/bin/env bash
# Gegenprobe: baut Fehler ein — jeder MUSS eine rote Zeile mit dem Namen
# SEINER Zusicherung erzeugen. Drei Ausgänge je Fall: gefangen · blind
# (Probe grün, obwohl der Fehler drin war) · toter Anker (die Sabotage traf
# nichts). Eine rote Zeile mit fremdem Namen zählt als „falscher Grund".
#
# Läuft in einer WEGWERF-KOPIE — eine liegengebliebene Sabotage im echten
# Baum sähe danach wie ein Baufehler aus.
set -u
WURZEL="$(cd "$(dirname "$0")/.." && pwd)"
KOPIE="$(mktemp -d)"
trap 'rm -rf "$KOPIE"' EXIT
gefangen=0; blind=0; tot=0; falsch=0

frisch() {
  rm -rf "$KOPIE/w"; mkdir -p "$KOPIE/w"
  (cd "$WURZEL" && tar --exclude=node_modules --exclude=.git -cf - .) | (cd "$KOPIE/w" && tar -xf -)
  ln -s "$(readlink -f "$WURZEL/node_modules")" "$KOPIE/w/node_modules"
}

# fall <name> <datei> <anker> <ersatz> <erwartete rote Zeile (grep -E)>
fall() {
  local name="$1" datei="$2" anker="$3" ersatz="$4" muster="$5"
  frisch
  if ! ANKER="$anker" ERSATZ="$ersatz" python3 - "$KOPIE/w/$datei" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read(); a = os.environ["ANKER"]
if s.count(a) != 1: sys.exit(1)
open(p, "w", encoding="utf-8").write(s.replace(a, os.environ["ERSATZ"]))
PY
  then echo "  ⚠ ANKER TOT: $name"; tot=$((tot+1)); return; fi
  local aus rc
  aus="$(cd "$KOPIE/w" && node tests/smoke.mjs 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then echo "  ✗ BLIND: $name"; blind=$((blind+1)); return; fi
  if printf '%s\n' "$aus" | grep '✗ ROT' | grep -Eq -- "$muster"; then
    echo "  ✓ gefangen: $name"; gefangen=$((gefangen+1))
  else
    echo "  ✗ FALSCHER GRUND: $name"; printf '%s\n' "$aus" | grep '✗ ROT' | head -3 | sed 's/^/      /'
    falsch=$((falsch+1))
  fi
}

frisch
if ! (cd "$KOPIE/w" && node tests/smoke.mjs >/dev/null 2>&1); then
  echo "✗ Die Probe ist schon ohne Eingriff rot — die Gegenprobe misst so nichts."; exit 1
fi
echo "── Gegenprobe Sende-Prüfer ──"
H=sende-pruefer.html

fall "der Tausenderpunkt wird nicht mehr erfasst (1. bleibt stehen)" $H \
  'const ZAHL = "(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{2})?|' 'const ZAHL = "(?:' 'GANZ verdeckt|Selbsttest'
fall "eine IBAN mit falscher Prüfziffer gilt als IBAN" $H \
  '  return rest === 1;' '  return true;' 'Selbsttest'
fall "eine Telefonnummer ohne Ländervorwahl wird gemeldet" $H \
  'const TELEFON = /(?:tel:|\+\d{2}[\s\-/()]?)' 'const TELEFON = /(?:tel:|\+\d{2}[\s\-/()]?)?' 'Selbsttest'
fall "derselbe Wert bekommt einen neuen Platzhalter" $H \
  '    let ph = vergeben.get(schl);' '    let ph = undefined;' 'denselben Platzhalter'
fall "Senden schickt den ursprünglichen Text" $H \
  '  const q = anfrage(a, schluessel, text);' '  const q = anfrage(a, schluessel, $("eingabe").value);' 'KEIN Befund-Wert|verdeckte Fassung'
fall "die Anthropic-Version fehlt in den Kopfzeilen" $H \
  '"anthropic-version": "2023-06-01", ' '' 'Kopfzeilen des Auftrags'
fall "ein freies Adressfeld kommt dazu" $H \
  '<select id="anbieter"></select>' '<select id="anbieter"></select><input id="adresse" type="url">' 'Eingabefeld für eine Adresse'
fall "alle Anbieter teilen sich einen Schlüssel" $H \
  'function schluesselName() { return SCHLUESSEL_PREFIX + $("anbieter").value; }' 'function schluesselName() { return SCHLUESSEL_PREFIX + "x"; }' 'nicht übernommen|app-eigenen Namen'
fall "ohne Schlüssel schweigt der Senden-Knopf über das Fehlende" $H \
  'if (!schluessel) { m.textContent = "Es fehlt ein Schlüssel für " + a.name + ". Tragen Sie ihn oben ein, oder nehmen Sie den Kopieren-Weg daneben."; return; }' '' 'was fehlt'
fall "der Hinweis ohne Namen-Liste verschwindet" $H \
  '$("namen-hinweis").hidden = namen.length > 0;' '$("namen-hinweis").hidden = true;' 'kein Name verdeckt'
fall "der Kopieren-Weg heißt wieder „stattdessen“" $H \
  'Für Ihr eigenes KI-Abo:' 'Stattdessen für Ihr eigenes KI-Abo:' 'stattdessen'
fall "die Antwort kommt ohne echte Werte zurück" $H \
  '  return String(text || "").replace(/⟦[A-Z]+-\d+⟧/g' '  return String(text || "") || String(text || "").replace(/⟦[A-Z]+-\d+⟧/g' 'echten Werten zurück|Selbsttest'
fall "der Selbsttest liest keine Marken mehr (grünes Nichts)" $H \
  '    if (!m) return;' '    if (!m || true) return;' 'Selbsttest'
# ⚠ Zwei Riegel decken einander (minmax UND overflow-wrap) — nur beide
#   zusammen wegzunehmen misst etwas. Mit einem allein war der Fall blind.
fall "das Raster läuft am Handy wieder quer" $H \
  $'@media (max-width:640px){.zwei{grid-template-columns:minmax(0,1fr)}}\ncode{overflow-wrap:anywhere}' '@media (max-width:640px){.zwei{grid-template-columns:1fr}}' '360 px'

echo "$gefangen gefangen · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ $((blind+falsch+tot)) -eq 0 ]

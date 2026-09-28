#!/usr/bin/env bash
# Gegenprobe: baut Fehler ein — jeder MUSS eine rote Zeile mit dem Namen
# SEINER Zusicherung erzeugen. Drei Ausgänge je Fall: gefangen · blind
# (Probe grün, obwohl der Fehler drin war) · toter Anker (die Sabotage traf
# nichts). Eine rote Zeile mit fremdem Namen zählt als „falscher Grund".
#
# NUR_ANKER=1 prüft nur, ob jeder Anker genau einmal trifft (Sekunden statt Minuten).
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
  if [ -n "${NUR_ANKER:-}" ]; then gefangen=$((gefangen+1)); return; fi
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
if [ -z "${NUR_ANKER:-}" ] && ! (cd "$KOPIE/w" && node tests/smoke.mjs >/dev/null 2>&1); then
  echo "✗ Die Probe ist schon ohne Eingriff rot — die Gegenprobe misst so nichts."; exit 1
fi
echo "── Gegenprobe Sende-Prüfer ──"
H=sende-pruefer.html

M=modules/25_pseudonym.js
# Seit 2026-09-28 steht die Erkennung in Sage-Modul 25. Eine Sabotage dort
# wirft zusätzlich den SHA-Pin um; gezählt wird trotzdem nur die rote Zeile
# der Zusicherung (das Muster), nicht der Pin.
fall "der Tausenderpunkt wird nicht mehr erfasst (1. bleibt stehen)" $M \
  'var ZAHL = "(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{2})?|' 'var ZAHL = "(?:' 'GANZ verdeckt|Selbsttest'
fall "eine IBAN mit falscher Prüfziffer gilt als IBAN" $M \
  '    return rest === 1;' '    return true;' 'Selbsttest'
fall "eine Telefonnummer ohne Ländervorwahl wird gemeldet" $M \
  'var TELEFON = /(?:tel:|\+\d{2}[\s\-/()]?)' 'var TELEFON = /(?:tel:|\+\d{2}[\s\-/()]?)?' 'Selbsttest'
fall "derselbe Wert bekommt einen neuen Platzhalter" $M \
  '        if (Object.prototype.hasOwnProperty.call(reverse, key)) return reverse[key];' '' 'denselben Platzhalter'
fall "Modul 25 wird hier abgewandelt (zweite Fassung)" $M \
  'var BELEG_FREI = /\b(?:RE|RG|INV|KD|KDNR|AN)-' 'var BELEG_FREI = /\b(?:RE|RG|INV|KD|KDNR|AN|XY)-' 'SHA-256 gepinnt'
fall "die Seite bringt wieder eigene Muster mit" $H \
  'const P = window.SbkimPseudonym || null;' 'const P = window.SbkimPseudonym || null; const IBAN_FORM = /x/g;' 'keine eigenen Erkennungs-Muster'
fall "die Seite lädt Modul 25 nicht mehr" $H \
  '<script src="modules/25_pseudonym.js"></script>' '' 'lädt Modul 25|Selbsttest'
fall "Modul 25 fehlt im Offline-Vorrat" sw.js \
  ', "modules/25_pseudonym.js"]' ']' 'Offline-Vorrat'
fall "ohne Modul 25 bleibt der Hinweis verborgen" $H \
  'if (!P) $("modul-fehlt").hidden = false;' '' 'Hinweis sichtbar'
fall "ohne Modul 25 fällt der erste Riegel weg (Kopieren und Senden)" $H \
  '  if (!P) { meldung("Der Prüfkern fehlt (siehe Hinweis oben)."); return null; }' '' 'Kopieren wird verweigert|Senden wird verweigert'
fall "die letzte Sicherung vor dem Hinausgehen fehlt" $H \
  '  return P.findLeak(text, alsObjekt(zuordnung));' '  return null;' 'versagt das Verdecken'
fall "Senden schickt den ursprünglichen Text" $H \
  '  const q = anfrage(a, schluessel, r.text);' '  const q = anfrage(a, schluessel, hinaus(m));' 'KEIN Befund-Wert|verdeckte Fassung'
fall "die Anthropic-Version fehlt in den Kopfzeilen" $H \
  '"anthropic-version": "2023-06-01", ' '' 'Kopfzeilen des Auftrags'
fall "ein freies Adressfeld kommt dazu" $H \
  '<textarea id="einfuegen-text"' '<input id="adresse" type="url"><textarea id="einfuegen-text"' 'Eingabefeld für eine Adresse'
fall "alle Anbieter teilen sich einen Schlüssel" $H \
  'const schluesselName = () => SCHLUESSEL_PREFIX + (($("anbieter") || {}).value || "anthropic");' 'const schluesselName = () => SCHLUESSEL_PREFIX + "x";' 'nicht übernommen|app-eigenen Namen'
fall "ohne Schlüssel schweigt der Senden-Knopf über das Fehlende" $H \
  'if (!schluessel) { e.textContent = "Es fehlt ein Schlüssel für " + a.name + ". Tragen Sie ihn oben ein, oder nehmen Sie den Kopieren-Weg daneben."; return; }' '' 'was fehlt'
fall "der Hinweis ohne Namen-Liste verschwindet" $H \
  'set("namen-hinweis", (e) => { e.hidden = namen.length > 0; });' 'set("namen-hinweis", (e) => { e.hidden = true; });' 'kein Name verdeckt'
fall "der Kopieren-Weg heißt wieder „stattdessen“" $H \
  'Für Ihr eigenes KI-Abo:' 'Stattdessen für Ihr eigenes KI-Abo:' 'stattdessen'
fall "die Antwort kommt ohne echte Werte zurück" $H \
  '  return P.rehydrate(String(text || ""), o);' '  return String(text || "");' 'echten Werten zurück|Selbsttest'
fall "der Selbsttest liest keine Marken mehr (grünes Nichts)" $H \
  '    if (!m) return;' '    if (!m || true) return;' 'Selbsttest'
fall "die zwei Wege stehen am Handy nebeneinander" $H \
  '@container (max-width:560px){.zwei{grid-template-columns:minmax(0,1fr)}}' '' 'untereinander'

# Beispiel-E-Mails (Klaus 2026-09-28)
fall "das Beispiel bringt seine Namen nicht mehr mit" $H \
  'betreff: "Rechnung RE-2026-04871 noch offen", namenExtra: "Musterbau GmbH, Beispiel",' 'betreff: "Rechnung RE-2026-04871 noch offen",' 'kein Wert des Beispiels'
fall "das Beispiel bringt keine Antwort mehr mit" $H \
  'antwortRoh: "Sehr geehrte Frau' 'antwortRoh: "", _alt: "Sehr geehrte Frau' 'echten Angaben zurück'
fall "der Hinweis „alles erfunden“ fehlt" $H \
  'if (m.beispiel) box.append(el("p", { class: "beispiel-hin"' 'if (false) box.append(el("p", { class: "beispiel-hin"' 'alles erfunden'
fall "die Mail verliert ihre Kopfzeilen" $H \
  '  if (v) k.push("Von: " + v);' '' 'Kopfzeilen'
fall "ein zweiter Tipp auf „Beispiel“ legt ein Doppel an" $H \
  'for (const alt of MAILS.filter((x) => x.bid === b.bid && x.ordner === "eingang"))' 'for (const alt of [])' 'kein Doppel'
fall "beim ersten Öffnen liegen keine Beispiele da" $H \
  'if (!MAILS.length && !lies(SAAT_KEY)) {' 'if (false) {' 'drei Beispiele'

# Postfach (Klaus 2026-09-28)
fall "die Mail wird nicht mehr auf dem Gerät gespeichert" $H \
  'return dbTx("readwrite", (s) => s.put(m)); }' 'return Promise.resolve(); }' 'nach dem Neuladen'
fall "die Zuordnung wird beim Hinausgehen nicht mitgespeichert" $H \
  'function merkeHinaus(m, r) { m.zuordnung = alsObjekt(r.zuordnung);' 'function merkeHinaus(m, r) {' 'nach dem Neuladen'
fall "der Absendername wird nicht mehr von selbst verdeckt" $H \
  '[m.vonName, m.anName, ...namenListe(m.namenExtra)]' '[...namenListe(m.namenExtra)]' 'ohne Zutun verdeckt'
fall "die Suche filtert nicht mehr" $H \
  'm.ordner === st.ordner && (!q || ganzeMail(m).toLowerCase().includes(q))' 'm.ordner === st.ordner' 'Suche findet'
fall "die Wahl hell/dunkel wird nicht gemerkt" $H \
  'schreib(THEMA_KEY, document.documentElement.dataset.theme);' '' 'übersteht das Neuladen'
fall "am Handy stehen Liste und Mail übereinander" $H \
  '.app[data-ansicht="lesen"] section.liste{display:none}' '' 'zeigt sie allein'
fall "das Postfach füllt große Schirme nicht mehr (Breite gedeckelt)" $H \
  'height:100vh;height:100dvh;width:100%}' 'height:100vh;height:100dvh;width:100%;max-width:1400px;margin:0 auto}' 'ganze Bildfläche'
fall "das Postfach füllt die Höhe nicht mehr" $H \
  'height:100vh;height:100dvh;width:100%}' 'width:100%}' 'ganze Bildfläche'
fall "installiert öffnet es im Vollbild ohne Fensterknöpfe" manifest.json \
  '"display": "standalone",' '"display": "fullscreen",' 'standalone'
fall "die Mail wird wieder auf Lesebreite gedeckelt" $H \
  'white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit}' 'white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit;max-width:72ch}' 'ganze Breite des Lesebereichs'
fall "der Themen-Knopf sagt nicht mehr, wohin er schaltet" $H \
  '$("thema-zeichen").textContent = d ? "☀" : "🌙"; $("thema-text").textContent = d ? " Hell" : " Dunkel";' '' 'wohin er schaltet'
fall "die Knöpfe verlieren den Glas-Stil" $H \
  'box-shadow:inset 0 2px 1px rgb(255 255 255/.45),inset 0 -5px 9px rgb(0 0 0/.35),inset 0 0 0 1px rgb(255 255 255/.12),0 10px 22px rgb(0 0 0/.22),0 3px 6px rgb(0 0 0/.18)}' 'box-shadow:none}' 'Glas-Stil'

# .eml und Teilen
fall "die .eml verliert Zeichensatz und X-Unsent" $H \
  '"MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8",' '"MIME-Version: 1.0",' 'X-Unsent'
fall "die abgelegte Antwort trägt Platzhalter statt echter Angaben" $H \
  'betreff: aus ? re(m.betreff) : m.betreff, text: klar,' 'betreff: aus ? re(m.betreff) : m.betreff, text: m.antwortRoh,' 'ohne Platzhalter'
fall "Umlaute im Betreff gehen roh in den Kopf" $H \
  '  if (/^[\x20-\x7e]*$/.test(s)) return s;' '  return s;' 'reines ASCII|hin und zurück'
fall "eine gespeicherte .eml bleibt in ihrem Ordner" $H \
  'm.ordner = "export"; m.exportiert' 'm.exportiert' 'Exportiert'
fall "Teilen schickt wieder eine .eml-Datei" $H \
  'const d = { title: m.betreff || "E-Mail", text: String(m.text || "") };' 'const d = { title: m.betreff || "E-Mail", files: [emlDatei(m)] };' 'keine Datei'
fall "die Namen aus dem Beispiel kleben zusammen" $H \
  'value: String(m.namenExtra || "").replace(/\s*\n\s*/g, ", "),' 'value: m.namenExtra || "",' 'Weitere Namen'
fall "eine eingefügte Mail wird nicht entschlüsselt (Quoted-Printable)" $H \
  'cte === "quoted-printable" ? dekodBytes(vonQP(rumpf), cs) : rumpf' 'cte === "quoted-printable" ? rumpf : rumpf' 'entschlüsselt'

echo "$gefangen gefangen · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ $((blind+falsch+tot)) -eq 0 ]

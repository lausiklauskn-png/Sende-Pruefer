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
  case "$name" in "${NUR_FALL:-}"*) ;; *) return ;; esac   # NUR_FALL="HB:" fährt nur die Fälle mit diesem Anfang
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
  ' "modules/25_pseudonym.js",' '' 'Modul 25 steht im Offline-Vorrat'
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

# Abschirmung (2026-09-29)
A=assets/abschirmung.js
fall "ein eingelegtes iframe wird nicht mehr erkannt" $A \
  'if (tag === "iframe") fund(' 'if (false) fund(' 'iframe wird erkannt'
fall "ein fremdes Element wird nicht mehr erkannt" $A \
  'else if (tag.indexOf("-") > 0) fund(' 'else if (false) fund(' 'fremdes Element wird erkannt'
fall "Marken an vorhandenen Elementen werden nicht mehr beobachtet" $A \
  'if (SPUREN[m.attributeName]) pruefe(m.target); return;' 'return;' 'VORHANDENEN Element'
fall "die KI-Schreibhilfe des Browsers bleibt an" $A \
  ' writingsuggestions: "false",' '' 'Klick schirmt ab'
fall "Felder, die danach entstehen, werden nicht abgeschirmt" $A \
  '        if (an) felder(n).forEach(schirme);' '' 'DANACH entsteht'
fall "die Wahl wird nicht gespeichert" $A \
  'an = !!v; schreib(an);' 'an = !!v;' 'Neuladen'
fall "der zweite Klick stellt die alten Werte nicht her" $A \
  'if (vorher) for (var a in vorher) { if (vorher[a] === null) feld.removeAttribute(a); else feld.setAttribute(a, vorher[a]); }' '' 'alten Werte'
fall "die Lampe erfährt nichts vom Fund" $A \
  'try { g.dispatchEvent(new CustomEvent("sbkim:fremd-alert"' 'try { if (0) g.dispatchEvent(new CustomEvent("sbkim:fremd-alert"' 'Lampe'
G=assets/sbkim-init.js
fall "die FREMD-Lampe hört der Abschirmung nicht mehr zu" $G \
  '    window.addEventListener("sbkim:fremd-alert", function () { lampe("lamp-fremd", "bad"); });' '' 'schon beim Laden'
fall "die Membran erlaubt eine fremde Herkunft" $G \
  '    allowedOrigins: []' '    allowedOrigins: ["*"]' 'fremde Herkunft'
fall "Modul 16 wird hier abgewandelt" modules/16_siegel.js \
  '"use strict";' '"use strict"; ' '16_siegel.js ist unverändert'
fall "ein Modul fehlt in der Kette" $G \
  '    ["",       "modules/07_apoptose.js"],
' '' 'alle 13 Pflicht-Module'
fall "05b läuft als klassisches Skript" $G \
  '["module", "modules/05b_nostr_relay.js"]' '["", "modules/05b_nostr_relay.js"]' 'ES-Modul'
fall "ein Komma in der Kette fehlt" $G \
  '    ["",       "modules/04_match.js"],' '    ["",       "modules/04_match.js"]' 'Komma'
fall "die Schublade fehlt im Kopf" $H \
  '<script>window.SBKIM_DB_SUFFIX = "sendepruefer";</script>' '' 'Schublade'
fall "das Siegel hängt nicht mehr in der Kopfleiste" $G \
  'badgeSelector: "#siegel-platz"' 'badgeSelector: "#nirgends"' 'Siegel'
fall "das Siegel bekommt keine Maße (0 px)" $H \
  '#sbkim-siegel-badge{width:28px;height:28px;' '#sbkim-siegel-badge{' '28'
fall "die Mycel-Blase hat keinen Platz mehr" $H \
  '<span class="mycel-platz" data-sbkim-mycel-platz></span>' '<span class="mycel-platz"></span>' 'angedockt'
fall "am Handy steht wieder alles ausgeklappt" $H \
  ' .netz-mehr{display:none;position:absolute;' ' .netz-mehr{position:absolute;' 'zugeklappt'
fall "der Lampen-Knopf klappt nicht auf" $G \
  '    knopf.addEventListener("click", function () { setze(leiste.getAttribute("data-offen") !== "1"); });' '' 'klappt Siegel'
fall "ein Tipp daneben klappt nicht zu" $G \
  '      setze(false);
    });' '    });' 'daneben'
fall "die Lampen-Namen stehen aufgeklappt im Knopf (die Leiste läuft über)" $H \
  '.lampen-legende{display:none}' '.lampen-legende{display:none} .netzleiste[data-offen="1"] .lamp-t{display:inline}' 'sprengen'
fall "das Suchfeld ist wieder höher als die Knöpfe" $H \
  'max-width:560px;height:40px;box-sizing:border-box;' 'max-width:560px;' 'gleich hoch'
fall "die Kopfleiste läuft am Handy wieder über" $H \
  ' header.kopf{gap:6px;padding:10px 12px}
 .kopf .rund{min-width:36px;height:36px;padding:0 8px}' '' 'Suchfeld|über den Rand'
fall "der Knoten ruft beim Laden schon ins Netz" $G \
  '      geraetenameFeldEinhaengen();' '      geraetenameFeldEinhaengen(); try { fetch("https://relay.family-projekt.de/ping").catch(() => {}); } catch (_e) {}' 'kein Aufruf nach draußen|keine einzige Anfrage'
fall "die Grenze der Abschirmung verschwindet aus dem Menü" $H \
  'eine Erweiterung kann das Signal übergehen, und Programme auf dem Gerät' 'Programme' 'Grenzen stehen im Menü'

# ── Handbuch, Icons, großes Bild (Klaus 2026-09-29) ──
HB=handbuch.html
T=tools/handbuch-szenen.mjs
fall "HB: das ? in der Kopfleiste führt nicht mehr zum Handbuch" $H \
  '<a class="rund" id="hilfe" href="handbuch.html"' '<a class="rund" id="hilfe" href="#"' 'führt zum Handbuch|öffnet das Handbuch'
fall "HB: eine Szene ändert sich, das Handbuch wird nicht neu gebaut" $T \
  'Das ist Ihr Postfach im Browser.' 'Das ist Ihr Postfach.' 'veraltet'
fall "HB: ein Bild des Handbuchs fehlt" $HB \
  'src="handbuch/01-postfach.jpg"' 'src="handbuch/01-weg.jpg"' 'Bild liegt da|Bild des Handbuchs lädt'
fall "HB: Vorführen nimmt auch eine Netz-Stimme" $HB \
  'return v.localService && /^de/i.test(v.lang);' 'return /^de/i.test(v.lang);' 'localService|Netz-Stimme'
fall "HB: ohne Skript bleiben die Szenen blass" $HB \
  'html.bewegt .szene{opacity:.25;' '.szene{opacity:.25;' 'OHNE Skript|ohne Skript'
fall "HB: Stopp hält die Vorführung nicht an" $HB \
  '  document.getElementById("stopp").addEventListener("click", stopp);' '' 'Stopp'
fall "HB: der Lichtkegel wird in der Mitte nicht groß" $H \
  'scale:4 7.14}' 'scale:1}' 'ganze Höhe'
fall "HB: der Lichtkegel bremst unterwegs ab (Zwischenhalt)" $H \
  'animation:licht-weg 3.5s linear infinite' 'animation:licht-weg 3.5s ease-in-out infinite' 'ohne Halt'
fall "HB: der Lichtkegel blitzt am Start nicht auf" $H \
  'kegel{0%{scale:4;' 'kegel{0%{scale:1;' 'vierfach'
fall "HB: der Lichtkegel läuft nicht mehr Klaus' Weg (alter Start)" $H \
  '0%{left:4.4%;top:58.6%}' '0%{left:16%;top:80%}' "Klaus' Weg"
fall "HB: der Lichtkegel springt (ein Schritt viel weiter als die anderen)" $H \
  '2.08%{left:6.4%;' '2.08%{left:12%;' 'ohne Halt'
fall "HB: der Lichtkegel läuft wieder im alten Tempo" $H \
  'animation:licht-weg 3.5s linear infinite,kegel 3.5s' 'animation:licht-weg 7s linear infinite,kegel 7s' 'doppelt so schnell'
fall "HB: der Boden strahlt als Fleck statt aus den Streifen des Bildes" $H \
  'url(icons/sende-pruefer-bild.webp) 0 0/100% 100%' 'rgb(255 255 255/.5)' 'Boden'
fall "HB: der Boden strahlt nicht mehr zurück (Maske ohne Boden)" $H \
  ';mask:radial-gradient(18% 32% at 50% 48%,#000 60%,transparent),radial-gradient(22% 7% at 50% 87%,#000 55%,transparent);' ';mask:radial-gradient(18% 32% at 50% 48%,#000 60%,transparent);' 'Boden'
fall "HB: das Icon wackelt nicht mehr" $H \
  '.bild-buehne{animation:var(--wackeln),schweben ' '.bild-buehne{animation:schweben ' 'Schweben'
fall "HB: das Icon kippt nicht an der Stelle des Scheins" $H \
  '@keyframes wackeln{' '@keyframes wackeln-weg{' 'Stelle'
fall "HB: das Schweben nimmt dem Wackeln die Drehung weg" $H \
  '50%{translate:0 -8px}' '50%{transform:translateY(-8px)}' 'Schweben'
fall "HB: im Handbuch wackelt es auch bei weniger Bewegung" tools/handbuch-vorlage.html \
  '@media (prefers-reduced-motion:reduce){.bild-buehne{animation:none}}' '' 'weniger Bewegung'
fall "HB: der Lichtkegel läuft auch bei weniger Bewegung" $H \
  '@media (prefers-reduced-motion:reduce){.bild-buehne::after,.bild-buehne::before{animation:none;opacity:0}}' '' 'weniger Bewegung'
fall "HB: das Bild fliegt nicht mehr in die Kopfleiste" $H \
  '  if (von) requestAnimationFrame(() => fliegen(von));' '' 'fliegt das Bild'
fall "HB: es fliegt auch bei weniger Bewegung" $H \
  ' || matchMedia("(prefers-reduced-motion: reduce)").matches) return;' ') return;' 'fliegt nichts'
fall "HB: das große Bild verschwindet aus dem leeren Raum" $H \
  'el("span", { class: "bild-buehne", "data-licht": "" },' 'el("span", { class: "bild-buehne" },' 'große Bild'
fall "HB: ein Icon im Manifest fehlt" manifest.json \
  '"icons/maskable-512.png"' '"icons/fehlt.png"' 'Manifest'
fall "HB: am kleinen Handy steht der Thema-Knopf wieder in der Kopfleiste" $H \
  ' #thema{display:none}}' '}' 'über den Rand|Suchfeld'

# ── Anleitung als Seite (Klaus 2026-09-29) ──
fall "ANL: die Anleitung ist veraltet (LIESMICH geändert, nicht neu gebaut)" LIESMICH.md \
  '## Selbsttest' '## Selbsttest (neu)' 'genau das, was aus LIESMICH'
fall "ANL: eine Grenze fehlt auf der Seite" anleitung.html \
  '<ol class="grenzen"><li>' '<ol class="grenzen"><li class="weg">' 'jede Grenze'
fall "ANL: der Text wird nicht mehr maskiert" tools/anleitung-bauen.mjs \
  'return maske(s)' 'return s' 'maskiert'
fall "ANL: die Seite verlinkt wieder die Rohdatei" $H \
  '<a href="anleitung.html">Anleitung und Grenzen</a>' '<a href="LIESMICH.md">Anleitung und Grenzen</a>' 'Rohdatei'
fall "ANL: das Handbuch verlinkt wieder die Rohdatei" handbuch.html \
  '<a class="knopf" href="anleitung.html">' '<a class="knopf" href="LIESMICH.md">' 'Handbuch ebenso'
fall "ANL: die Anleitung fehlt im Offline-Vorrat" sw.js \
  '"anleitung.html", ' '' 'Offline-Vorrat'
fall "ANL: am Handy läuft die Tabelle quer" anleitung.html \
  ' table,thead,tbody,tr,td{display:block;width:100%}' ' table{min-width:520px}' 'Tabelle nicht'
fall "ANL: der lange Inhalts-Link bricht nicht mehr um" anleitung.html \
  ' .film a{flex:0 1 auto;min-width:0}' ' .film a{flex:none;white-space:nowrap}' 'Tabelle nicht'

# ── Aufgaben an die KI (Klaus 2026-09-29) ──
fall "AUF: die Anweisung verlangt nicht mehr, Platzhalter zu übernehmen" $H \
  'Übernimm jeden Platzhalter in ⟦ ⟧ genau so, wie er steht, und erfinde' 'Erfinde' 'ganze Anweisung'
fall "AUF: die eigene Aufgabe geht am Verdecken vorbei" $H \
  'function hinaus(m) { const b = String(m.bitte || "").trim(); return ganzeMail(m) + (b ? "\n\n---\n" + b : ""); }' 'function hinaus(m) { return ganzeMail(m); }' 'verdeckt hinaus|trägt sie unter'
fall "AUF: an einer eingefügten Mail fehlt die Mahnung" $H \
  '  ["⏰ Mahnung", ' '  ["⏰ Erinnerung", ' 'Mahnung und Angebot'
fall "AUF: gemerkte Aufgaben werden nicht gespeichert" $H \
  'const merke = (l) => { schreib(EIGENE, JSON.stringify(l)); reiheZeichnen(); };' 'const merke = (l) => { reiheZeichnen(); };' 'Knopf merken'
fall "AUF: ✕ vergisst die Aufgabe nicht" $H \
  'e.stopPropagation(); merke(ei.filter((x) => x[0] !== n));' 'e.stopPropagation();' 'vergisst'
fall "AUF: Anweisung bauen nimmt den eingetragenen Text nicht" $H \
  'onclick: () => setze(eigen.value.trim() || "…") }, "Anweisung bauen")' 'onclick: () => setze("…") }, "Anweisung bauen")' 'selbst eingetragene'

fall "HOL: der Link zur Schlüssel-Seite fehlt" $H \
  '        el("a", { id: "schluessel-holen",' '        null && el("a", { id: "schluessel-holen",' 'sichtbarer Link zur Schlüssel-Seite'
fall "HOL: der Link gibt window.opener her" $H \
  'target: "_blank", rel: "noopener noreferrer", style' 'target: "_blank", style' 'window.opener nicht her'
fall "HOL: der Link wechselt nicht mit dem Anbieter" $H \
  '  $("schluessel-holen").href = a.holen;' '  $("schluessel-holen").href = $("schluessel-holen").href || a.holen;' 'wechselt mit dem Anbieter'
N=assets/anbieter.js
fall "HOL: eine Schlüssel-Seite steht ausserhalb der Liste" $N \
  '      holen: "https://console.mistral.ai/api-keys" })' '      holen: ["https://console.mistral.ai", "/api-keys"].join("") })' 'eine Schlüssel-Seite'
fall "ANB: Claude steht nicht mehr oben" $N \
  '    anthropic: f({ name: "Claude (Anthropic)",' '    claude: f({ name: "Claude (Anthropic)",' 'Claude steht oben'
fall "ANB: ChatGPT bekommt max_tokens statt max_completion_tokens" $N \
  ' grenze: "max_completion_tokens",' '' 'max_completion_tokens'
fall "ANB: eine KI-Adresse steht in der Seite statt in der Liste" $H \
  'const ANBIETER = window.SPAnbieter || Object.freeze({});' 'const ANBIETER = window.SPAnbieter || Object.freeze({ notfall: { adresse: "https://api.openai.com/v1/chat/completions" } });' 'keine KI-Adresse'
fall "ANB: eine Ablehnung als Liste wird nicht gelesen" $H \
  ' if (Array.isArray(j)) j = j[0] || {};' '' 'als Liste'
fall "EIGEN: jedes sicherheit.html gilt als eigen" assets/abschirmung.js \
  ' && u.pathname.replace(' ' && true || u.pathname.replace(' 'anderen Ordner'
# ── Klaus 2026-09-29: Warnzeile wegklicken, Abschirmung aufheben, Funde im Fremdzugriff-Fenster ──
fall "WEG: das Wegklicken schirmt stattdessen ab" sende-pruefer.html \
  '$("fremd-weg").addEventListener("click", AB.ausblenden);' '$("fremd-weg").addEventListener("click", () => AB.setze(true));' 'schirmt NICHT ab'
fall "WEG: ausgeblendet bleibt es auch bei neuen Funden" assets/abschirmung.js \
  'return funde.length <= stillBis;' 'return stillBis > 0;' 'NEUER Fund bringt sie'
fall "WEG: der Knopf sagt nicht, dass er aufhebt" assets/abschirmung.js \
  'k.title = an ?' 'k.title = false ?' 'zweiter Tipp es aufhebt'
fall "WEG: das Fremdzugriff-Fenster bekommt die Funde nicht" assets/sbkim-init.js \
  'setTimeout(abschirmFundeInsFenster, 0);' 'void 0;' 'nennt die Funde der Abschirmung'
fall "WEG: die Funde gehen als HTML ins Fenster" assets/sbkim-init.js \
  'li.textContent = x.was;' 'li.innerHTML = "<i>" + x.was + "</i>";' 'als Text, nicht als HTML'
fall "WEG: der Knopf im Fremdzugriff-Fenster schaltet nicht" assets/sbkim-init.js \
  'k.addEventListener("click", function () { AB.umschalten();' 'k.addEventListener("click", function () {' 'im Fenster lässt sich abschirmen'
fall "EIGEN: die Erklärseite fehlt im Offline-Vorrat" sw.js \
  ', "sicherheit.html"]' ']' 'Erklärseite des Siegels'
fall "ANB: die Seite lädt die Liste nicht" $H \
  '<script src="assets/anbieter.js"></script>' '' 'lädt die Liste'

fall "LIMIT: Mistral bekommt keine Ausgabe-Grenze" $H \
  'body: { [a.grenze || "max_tokens"]: 4096, model: a.modell,' 'body: { model: a.modell,' 'Ausgabe-Grenze'
A=assets/ablehnung.js
fall "TARIF: eine Tarif-Ablehnung sagt nicht, woran es liegt" $A \
  'if (/subscription tier|not available/i.test(grund))' 'if (false)' 'nicht das Guthaben'
fall "LIMIT: ein 429 wird nicht wiederholt" $A \
  '    if (antwort.status !== 429) return antwort;' '    return antwort;' 'vor der zweite Versuch'
fall "LIMIT: die Seite fragt die Wiederholung gar nicht" $H \
  'await (H ? H.holen(' 'await (false ? H.holen(' 'vor der zweite Versuch'
fall "LIMIT: ein bleibendes 429 wird nicht erklärt" $A \
  '    if (status === 429)' '    if (false)' 'Grenze und den Weg'
fall "LIMIT: es wird mehr als einmal wiederholt" $A \
  '    return fetch(url, init);' '    await fetch(url, init); return fetch(url, init);' 'nicht öfter'

T=assets/tresor-ui.js
fall "TRESOR: die Seite legt den Schlüssel beim Senden wieder offen ab" $H \
  'schluessel = $("schluessel").value.trim();' 'schluessel = $("schluessel").value.trim(); schreib(schluesselName(), schluessel);' 'nirgends offen in den Speicher'
fall "TRESOR: ein zu kurzer Code wird angenommen" $T \
  'if (code.length < MIN) return' 'if (false) return' 'zu kurzer Code'
fall "TRESOR: der alte Klartext-Eintrag bleibt liegen" $T \
  'weg(KLAR + p());' ';' 'alte Klartext-Eintrag ist weg'
fall "TRESOR: der Code wird mit abgelegt" $T \
  'offen[p()] = schl; $("tresor-code").value = "";
      zeigen(); sag("Im Tresor' 'offen[p()] = schl; localStorage.setItem("sendepruefer_tresor_code", code); $("tresor-code").value = "";
      zeigen(); sag("Im Tresor' 'auch der Code'
fall "TRESOR: Schlüssel löschen lässt den Tresor stehen" $T \
  'weg(PREFIX + p()); delete offen[p()];' 'delete offen[p()];' 'nimmt auch den Tresor'
fall "TRESOR: das Schloss wird abgewandelt" assets/schluesseltresor.js \
  'var RUNDEN = 600000;' 'var RUNDEN = 1000;' 'schluesseltresor.js ist unver'

A=assets/anhaenge.js
# Anhänge (2026-09-29). Jeder Fall nimmt EINE Erkennung weg; gezählt wird die rote Zeile mit ihrem Namen.
fall "ANH: Daten hinter dem Bildende werden nicht mehr gemeldet" $A \
  '    if (leer && rest.length <= 64) return;' '    return;' 'Daten hinter dem Bildende|Metadaten und Anhängsel'
fall "ANH: Füllbytes gelten als Anhängsel" $A \
  '    if (leer && rest.length <= 64) return;' '' 'Füllbytes'
fall "ANH: GPS wird geraten statt im IFD0 gesucht" $A \
  '        var gps = exifHatGps(b, i + 10, Math.min(i + 2 + len, b.length));' '        var gps = true;' 'keine erfundene Ortsangabe'
fall "ANH: PNG-Textfelder werden übersehen" $A \
  '      if (typ === "tEXt" || typ === "iTXt" || typ === "zTXt") {' '      if (false) {' 'Text-Feld in den Metadaten|Metadaten und Anhängsel'
fall "ANH: ein SVG-Skript wird übersehen" $A \
  'if (/<script[\s>]/i.test(s)) melde' 'if (false) melde' 'Skript und Ereignis'
fall "ANH: ein fremder Abruf aus der SVG wird übersehen" $A \
  '      wirte[w] = 1; melde("SVG-VERWEIS"' '      wirte[w] = 1; void ("SVG-VERWEIS"' 'fremden Rechner|fremder Abruf'
fall "ANH: das SVG-Skript geht mit an Modul 25" $A \
  '    var text = s.replace(/<script[\s\S]*?<\/script>/gi, " ")' '    var text = s' 'das Skript nicht'
fall "ANH: Makros werden übersehen" $A \
  '    if (makro.length) melde("OFFICE-MAKRO"' '    if (false) melde("OFFICE-MAKRO"' 'Makro'
fall "ANH: gepackte Office-Teile werden nicht entpackt" $A \
  'new welt.DecompressionStream("deflate-raw")' 'new welt.DecompressionStream("deflate")' 'Word \(gepackt\)'
fall "ANH: Office-Verweise nach außen werden übersehen" $A \
  '            if (!/TargetMode="External"/.test(m[0])) continue;' '            continue;' 'Vorlage von außen|Verweis'
fall "ANH: der Word-Text geht nicht an Modul 25" $A \
  '          texte.push(entitaeten(xml.replace(' '          void (entitaeten(xml.replace(' 'Text samt Verfasser|Angaben im Text'
fall "ANH: der PDF-Prüfer wird nicht nachgeladen" $A \
  's.src = "assets/pruefer-formate.js";' 's.src = "assets/fehlt.js";' 'PDF-Prüfer wurde nachgeladen'
fall "ANH: die Endung wird nicht mit dem Dateikopf verglichen" $A \
  '    else if (ENDUNGEN[art] && endung && ENDUNGEN[art].indexOf(endung) < 0)' '    else if (false)' 'nicht zum Dateikopf passt'
fall "ANH: ein Programm wird nur an der Endung erkannt" $A \
  '    if (b[0] === 0x4D && b[1] === 0x5A) return "programm";' '' 'am Dateikopf erkannt'
fall "ANH: ein Name wird als HTML eingesetzt" $A \
  '      el("div", { class: "anhang-kopf" }, el("b", { class: "anhang-name" }, a.name),' '      el("div", { class: "anhang-kopf" }, (function () { var x = el("b", { class: "anhang-name" }); x.innerHTML = a.name; return x; })(),' 'als Text da'
fall "ANH: die sichere Fassung zeichnet nicht neu, sondern gibt das Original" $A \
  '          return { blob: neu, name:' '          return { blob: a.blob, name:' 'sichere Fassung von'
fall "ANH: Anhänge werden nicht gespeichert" $A \
  '  function speichern(m) { var f = g("jetztSpeichern"); if (f) f(m); }' '  function speichern(m) {}' 'nach dem Neuladen'
fall "ANH: Entfernen nimmt alle weg" $A \
  '      m.anhaenge = (m.anhaenge || []).filter(function (x) { return x.id !== a.id; });' '      m.anhaenge = [];' 'genau diesen einen'
fall "ANH: der .eml-Zuhörer hängt erst nach dem Laden (Seite leert das Feld vorher)" $A \
  '     SEINEM change-Zuhörer — wer danach kommt, findet keine Datei mehr. */
  emlBeobachten();' '     SEINEM change-Zuhörer — wer danach kommt, findet keine Datei mehr. */
  document.addEventListener("DOMContentLoaded", emlBeobachten);' 'eml mit Anhang'
fall "ANH: kodierte Anhang-Namen werden nicht entschlüsselt" $A \
  '      var name = kopfWort ? kopfWort(nm[1]) : nm[1];' '      var name = nm[1];' 'kodiertem Namen'
fall "ANH: der PDF-Prüfer wird abgewandelt" assets/pruefer-formate.js \
  '    { re: /\/Launch\b/,' '    { re: /\/Launchx\b/,' 'pruefer-formate.js ist unver'
fall "ANH: die Anhang-Prüfung fehlt im Offline-Vorrat" sw.js \
  ' "assets/anhaenge.js",' '' 'Offline-Vorrat'

echo "$gefangen gefangen · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ $((blind+falsch+tot)) -eq 0 ]

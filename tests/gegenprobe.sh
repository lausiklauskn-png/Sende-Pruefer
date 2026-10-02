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
  'return v.localService && re.test(v.lang);' 'return re.test(v.lang);' 'localService|Netz-Stimme'
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

# ── Aufgenommene Stimme im Handbuch (Klaus 2026-10-02) ──
# Benannte Grenzen, ohne Fall: „ein Abspieler für alle Szenen" (headless gibt es keine
# Autoplay-Sperre, ein neuer je Szene wäre hier nicht von einem geteilten zu unterscheiden)
# und der Zähler „lauf" (nach Stopp hält schon „laeuft" jede späte Meldung auf).
fall "TON: eine Szene verliert ihre Aufnahme" handbuch.html \
  ' data-ton="handbuch/ton/de/01-postfach.mp3"' '' 'trägt ihre Aufnahme'
fall "TON: Vorführen nimmt wieder die Browser-Stimme" handbuch.html \
  'q = tonVon(s), d = dauerVon(s)' 'q = null, d = dauerVon(s)' 'spielt die Aufnahme der Szene'
fall "TON: ohne Aufnahme gibt es keinen Rückweg zur Stimme" handbuch.html \
  'if (geklappt) naechste(); else sprechen(s, text, d, mein);' 'naechste();' 'spielt die Aufnahme nicht'
fall "TON: die Schnitte haben eine Lücke" handbuch/ton/de/schnitte.json \
  '"von": 15.49,' '"von": 16.49,' 'lückenlos'
fall "TON: der Worker legt auch Teil-Antworten ab" sw.js \
  'if (r.status === 200) {' 'if (r.ok) {' 'ganze Antworten'
fall "TON: die Aufnahme rutscht in den Installations-Vorrat" sw.js \
  '"handbuch.html", ' '"handbuch.html", "handbuch/ton/de/01-postfach.mp3", ' 'NICHT im Installations-Vorrat'
fall "TON: eine Szene verliert ihre englische Aufnahme" handbuch.html \
  ' data-ton-en="handbuch/ton/en/01-postfach.mp3"' '' 'englische Aufnahme .data-ton-en.'
fall "TON: Watch in English spielt die deutsche Aufnahme" handbuch.html \
  ': s.dataset["ton" + gross()]; }' ': s.dataset.ton; }' 'Watch in English spielt die englische'
fall "TON: der englische Knopf fehlt" handbuch.html \
  '<button class="knopf" id="vorfuehren-en" type="button" lang="en">' '<button class="knopf" id="vorfuehren-xx" type="button" lang="en">' 'Watch in English“ steht'
fall "TON: die englischen Schnitte haben eine Lücke" handbuch/ton/en/schnitte.json \
  '"von": 11.46,' '"von": 12.46,' 'englischen Schnitte'
fall "TON: der russische Knopf fehlt" handbuch.html \
  '<button class="knopf" id="vorfuehren-ru" type="button" lang="ru">' '<button class="knopf" id="vorfuehren-xx" type="button" lang="ru">' 'Смотреть по-русски“ steht'
fall "TON: die russischen Schnitte haben eine Lücke" handbuch/ton/ru/schnitte.json \
  '"von": 15.16,' '"von": 16.16,' 'russischen Schnitte'
fall "TON: die russische Zuordnung gilt als eindeutig, obwohl sie es nicht ist" handbuch/ton/ru/schnitte.json \
  '"eindeutig": true,' '"eindeutig": false,' 'russischen Schnitte'
fall "TON: Смотреть по-русски spielt die deutsche Aufnahme" handbuch.html \
  'if (ru) ru.addEventListener("click", function () { start("ru"); });' 'if (ru) ru.addEventListener("click", function () { start("de"); });' 'по-русски spielt die russische'

# ── Abspieler (Klaus 2026-10-02: „wie ein Videoplayer in jeder Sprache") ──
fall "REGLER: Pause hält nicht an" handbuch.html \
  'else { halt(); pausiert = true; anzeigen(); }' 'else { anzeigen(); }' 'hält an: in der Pause'
fall "REGLER: ⏭ springt nicht vor" handbuch.html \
  'if (laeuft) gehe(i + 1, 0, !pausiert); });' 'if (laeuft) gehe(i, 0, !pausiert); });' 'springt eine Szene vor'
fall "REGLER: ⏮ springt nicht zurück" handbuch.html \
  'if (laeuft) gehe(i - 1, 0, !pausiert); });' 'if (laeuft) gehe(i, 0, !pausiert); });' 'springt eine Szene zurück'
fall "REGLER: ziehen bewegt das Bild nicht mit" handbuch.html \
  'var st = stelle(Number(zeit.value)); zeigeSzene(st[0], false); pos = st[1]; anzeigen();' 'pos = 0; anzeigen();' 'springt an die Stelle'
fall "REGLER: loslassen spielt in der Pause los" handbuch.html \
  'weiter = ziehen ? warSpielend : !pausiert;' 'weiter = true;' 'bleibt angehalten, an genau'
fall "REGLER: weiterspielen beginnt die Szene von vorn" handbuch.html \
  'try { a.currentTime = pos; } catch (_e) {}' '' 'nicht von vorn'
fall "REGLER: die Länge kommt nicht aus den Schnitten" handbuch.html \
  'return d > 0 ? d : Math.max(5,' 'return 0 > 1 ? d : Math.max(5,' 'Summe der Szenenlängen'
fall "REGLER: keine Marken an den Szenenwechseln" handbuch.html \
  'marken.appendChild(m);' '' 'eine Marke an jedem'
fall "REGLER: der Abspieler spricht nur Deutsch" handbuch.html \
  'document.getElementById("vor").setAttribute("aria-label", T.vor);' '' 'beschriftet in der Sprache'
fall "REGLER: am Handy läuft die Steuerung aus der Leiste" handbuch.html \
  '.buehne .steuer{display:flex;flex-wrap:wrap;' '.buehne .steuer{display:flex;flex-wrap:nowrap;width:600px;' '380 px: der Abspieler passt'

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
  ', "sicherheit.html", "impressum.html"' ', "impressum.html"' 'Erklärseite des Siegels'
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
K=assets/pruefer-anhang.js   # byte-1:1 aus dem Auslieferungsprüfer; ein Eingriff wirft AUCH den Pin — gezählt wird die Zeile der Zusicherung
# Anhänge (2026-09-29). Jeder Fall nimmt EINE Erkennung weg; gezählt wird die rote Zeile mit ihrem Namen.
fall "ANH: Daten hinter dem Bildende werden nicht mehr gemeldet" $K \
  '    if (leer && rest.length <= 64) return;' '    return;' 'Daten hinter dem Bildende|Metadaten und Anhängsel'
fall "ANH: Füllbytes gelten als Anhängsel" $K \
  '    if (leer && rest.length <= 64) return;' '' 'Füllbytes'
fall "ANH: GPS wird geraten statt im IFD0 gesucht" $K \
  '        var gps = exifHatGps(b, i + 10, Math.min(i + 2 + len, b.length));' '        var gps = true;' 'keine erfundene Ortsangabe'
fall "ANH: PNG-Textfelder werden übersehen" $K \
  '      if (typ === "tEXt" || typ === "iTXt" || typ === "zTXt") {' '      if (false) {' 'Text-Feld in den Metadaten|Metadaten und Anhängsel'
fall "ANH: ein SVG-Skript wird übersehen" $K \
  'if (/<script[\s>]/i.test(s)) melde' 'if (false) melde' 'Skript und Ereignis'
fall "ANH: ein fremder Abruf aus der SVG wird übersehen" $K \
  '      wirte[w] = 1; melde("SVG-VERWEIS"' '      wirte[w] = 1; void ("SVG-VERWEIS"' 'fremden Rechner|fremder Abruf'
fall "ANH: das SVG-Skript geht mit an Modul 25" $K \
  '    var text = s.replace(/<script[\s\S]*?<\/script>/gi, " ")' '    var text = s' 'das Skript nicht'
fall "ANH: Makros werden übersehen" $K \
  '    if (makro.length) melde("OFFICE-MAKRO"' '    if (false) melde("OFFICE-MAKRO"' 'Makro'
fall "ANH: gepackte Office-Teile werden nicht entpackt" $K \
  'new welt.DecompressionStream("deflate-raw")' 'new welt.DecompressionStream("deflate")' 'Word \(gepackt\)'
fall "ANH: Office-Verweise nach außen werden übersehen" $K \
  '            if (!/TargetMode="External"/.test(m[0])) continue;' '            continue;' 'Vorlage von außen|Verweis'
fall "ANH: der Word-Text geht nicht an Modul 25" $K \
  '          texte.push(entitaeten(xml.replace(' '          void (entitaeten(xml.replace(' 'Text samt Verfasser|Angaben im Text'
fall "ANH: der PDF-Prüfer wird nicht nachgeladen" $A \
  'laden("assets/pruefer-formate.js"' 'laden("assets/fehlt.js"' 'PDF-Prüfer wurde nachgeladen'
fall "ANH: die Endung wird nicht mit dem Dateikopf verglichen" $K \
  '    else if (ENDUNGEN[art] && endung && ENDUNGEN[art].indexOf(endung) < 0)' '    else if (false)' 'nicht zum Dateikopf passt'
fall "ANH: ein Programm wird nur an der Endung erkannt" $K \
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
fall "ANH: pruefer-anhang.js wird abgewandelt (Pin)" $K \
  '  var GROESSE_MAX = 25 * 1024 * 1024;' '  var GROESSE_MAX = 26 * 1024 * 1024;' 'pruefer-anhang.js ist unver'
fall "ANH: der Prüfteil wird nicht nachgeladen" $A \
  'laden("assets/pruefer-anhang.js"' 'laden("assets/fehlt.js"' 'lädt pruefer-anhang.js nach|alle fünf'
fall "ANH: die Oberfläche trägt wieder eine eigene Prüfung" $A \
  '  function artVon(b) {' '  function pngPruefen() {}
  function artVon(b) {' 'keine eigene Prüfung mehr'
fall "ANH: der Prüfteil fehlt im Offline-Vorrat" sw.js \
  ' "assets/pruefer-anhang.js",' '' 'Offline-Vorrat'

# Anhänge gehen mit hinaus (Klaus 2026-09-29)
fall "EXP: die .eml trägt keinen Anhang" $A \
  '      liste.forEach(function (a, k) {' '      [].forEach(function (a, k) {' 'JEDEN Anhang'
fall "EXP: ein Anhang kommt verändert in die .eml" $A \
  'b64(new Uint8Array(inhalte[k]))' 'b64(new Uint8Array(inhalte[k]).subarray(1))' 'Byte für Byte'
fall "EXP: die Wege der Seite werden nicht ersetzt" $A \
  '    exportEinbauen();
    beobachten();' '    beobachten();' 'JEDEN Anhang'
fall "EXP: Teilen lässt die Dateien weg" $A \
  '      if (geht.length) d.files = geht;' '' 'gehen mit'
fall "EXP: was nicht mitgeht, wird verschwiegen" $A \
  '      var rest = nicht.length ?' '      var rest = false ?' 'beim Namen genannt'
fall "EXP: die KI-Antwort übernimmt den Anhang nicht" $A \
  '      if (b && b.anhaenge && b.anhaenge.length) {' '      if (false) {' 'ursprünglichen Mail'
fall "EXP: ein entfernter Anhang kommt wieder" $A \
  ' && !m.anhaengeGeerbt && m.bezug) {' ' && m.bezug) {' 'kommt nicht wieder'
fall "TEILBAR: jede Datei gilt als teilbar" $A \
  '    if (!navigator.canShare) return "nein";' '    return "ja";' 'VOR dem Teilen'
fall "TEILBAR: ohne Teilen heißt es trotzdem ja" $A \
  '    if (!navigator.share) return "ohne";' '' 'nicht „ja“'
fall "TEILBAR: die Übersicht fehlt" $A \
  '      wegeUebersicht(m),' '' 'die Übersicht nennt'
fall "TEILBAR: kein Einzeln-Speichern" $A \
  '      herunterladen(a.blob, a.name);' '' 'genau diese Datei'
fall "TEILBAR: die Meldung schickt wieder an eine neue Mail" $A \
  'nicht an eine neue Mail hängen — sonst' 'gern an eine neue Mail hängen — sonst' 'nicht an eine neue Mail gehört'

# ── Stufe 2 D · PDF-Seitentext (2026-09-29). pdf.js aus vendor/pdfjs/ (seit 2026-09-30).
A=assets/anhaenge.js
fall "PDFTEXT: die KI-Liste wird nicht mehr geladen" $A \
  '.then(function () { return laden("assets/pruefer-mail.js", function () { return welt.PrueferMail; }); })' '.then(function () { return true; })' 'KI-Liste'
fall "PDFTEXT: der Anhang-Prüfer kommt vor der KI-Liste" $A \
  '  var bereit = laden("assets/pruefer-formate.js", function () { return welt.PrueferFormate; })
    .then(function () { return laden("assets/pruefer-mail.js", function () { return welt.PrueferMail; }); })
    .then(function () { return laden("assets/pruefer.js", function () { return welt.Auslieferungspruefer; }); })
    .then(function () { return laden("assets/pruefer-anhang.js", function () { return welt.PrueferAnhang; }); })' '  var bereit = laden("assets/pruefer-formate.js", function () { return welt.PrueferFormate; })
    .then(function () { return laden("assets/pruefer-anhang.js", function () { return welt.PrueferAnhang; }); })
    .then(function (x) { laden("assets/pruefer-mail.js", function () { return welt.PrueferMail; }); return x; })
    .then(function () { return laden("assets/pruefer.js", function () { return welt.Auslieferungspruefer; }); })' 'Reihenfolge'
fall "PDFTEXT: der Weg zu pdf.js wird nicht gesetzt" $A \
  '      if (welt.PrueferAnhang.pfade) welt.PrueferAnhang.pfade(' '      if (false) welt.PrueferAnhang.pfade(' 'im Browser: das PDF meldet'
fall "PDFTEXT: die Mailadresse aus dem Seitentext geht nicht an Modul 25" $A \
  'var funde = r.text && finde ?' 'var funde = r.text && finde && r.art !== "pdf" ?' 'Angabe'
fall "PDFTEXT: die KI-Liste fehlt im Offline-Vorrat" sw.js \
  ', "assets/pruefer-mail.js"' '' 'Offline-Vorrat'

# ── Eigenständig (2026-09-30): pdf.js aus dem eigenen Ordner, nicht aus Workflow PDF
fall "ALLEIN: der Weg zu pdf.js zeigt wieder auf Workflow PDF" assets/anhaenge.js \
  'pfade({ pdfjs: new URL("vendor/pdfjs/", location.href).href,' 'pfade({ pdfjs: new URL("../Workflow-PDF/vendor/pdfjs/", location.href).href,' 'EIGENEN Ordner|Workflow-PDF'
fall "ALLEIN: die mitgelieferte pdf.js ist nicht mehr die gepinnte" vendor/pdfjs/pdf.min.js \
  '/**' '/* x */ /**' 'byte-gleich'

# OCR (Stufe 2 A, 2026-09-30): Text im Bild lesen
fall "OCR: der Weg zur Texterkennung fehlt" $A \
  ', tesseract: new URL("vendor/tesseract/", location.href).href' '' 'BILD-KI-ANWEISUNG|Texterkennung'
fall "OCR: nichts gelesen heisst wieder nichts gefunden" $A \
  '      if (!r.befunde.length && !funde.length) liste.append(r.bildUngeprueft' '      if (!r.befunde.length && !funde.length) liste.append(false' 'ungepr'

# START (2026-10-01): die Startseite „Was die App kann"
fall "START: index.html springt wieder direkt in die App" index.html \
  'localStorage.getItem("sendepruefer_start_v1") !== "1"' 'false' 'ersten Öffnen steht die Startseite'
fall "START: der Haken merkt sich nichts mehr" start.html \
  'if (h.checked) localStorage.setItem(K, "1");' 'if (false) localStorage.setItem(K, "1");' 'Haken merkt sich'
fall "START: ein Fund ohne Schritte" start.html \
  '<ol><li>Nicht öffnen, nicht weiterleiten.</li><li>Die Mail löschen.</li><li>Beim Absender auf einem anderen Weg nachfragen, ob er wirklich etwas geschickt hat.</li></ol>' '<ol><li>Nicht öffnen.</li></ol>' 'Schritte in Reihenfolge'
fall "START: die Grenze verschwindet" start.html \
  '<b>Kein Virenscanner.</b>' '<b>Sicher.</b>' 'Grenzen stehen'
fall "START: Werkstatt-Jargon auf der Seite" start.html \
  'Ein Handyfoto trägt oft' 'Laut Gegenprobe trägt ein Handyfoto oft' 'Jargon'
fall "START: das Zeichen führt nicht mehr zur Startseite" assets/sbkim-init.js \
  'a.id = "ueberblick"; a.href = "start.html";' 'a.id = "ueberblick"; a.href = "handbuch.html";' 'Zeichen in der Kopfleiste'
fall "START: ein Bild ohne feste Maße" start.html \
  'alt="Das Postfach des Sende-Prüfers mit Ordnern und zwei Beispiel-Mails" width="1280" height="800"' 'alt="Das Postfach des Sende-Prüfers mit Ordnern und zwei Beispiel-Mails"' 'feste Maße'

# Was jetzt tun und die Stelle im Bild (Klaus 2026-10-01)
fall "WASTUN: ein Anhang mit Anweisung trägt keine Schritte" assets/anhaenge.js \
  '      ruhigAnhaengen(liste, r.befunde, schon);' '' 'ruhige Schritte, einmal'
# Kein Fall für „je Art einmal“: in keiner Vorlage steht dieselbe Art zweimal
# an einem Anhang (gemessen 2026-10-01: der Fall war blind). Benannte Grenze.
fall "WASTUN: die Stelle im Bild wird nicht markiert" assets/anhaenge.js \
  '      markiertAnhaengen(liste, a, r.befunde);' '' 'rot markiert im Bild'
fall "WASTUN: der Hinweis zur sicheren Fassung fehlt" assets/anhaenge.js \
  '            if (r.art === "png") liste.append' '            if (false) liste.append' 'Bits behält'

# 🧪 Beispiel-E-Mail mit Test-Anhängen (Klaus 2026-10-01)
fall "TESTMAIL: der Knopf im Menü fehlt" assets/anhaenge.js \
  '    testKnopfEinbauen();' '' 'Beispiel-E-Mail mit Test-Anh'
fall "TESTMAIL: die Mail kommt ohne Anhänge" assets/anhaenge.js \
  'm.anhaenge = dateien.map(' 'm.anhaenge = [].map(' 'mit zwei Anh'
fall "TESTMAIL: ein zweiter Tipp legt eine zweite Mail an" assets/anhaenge.js \
  'var alt = MAILS.splice(i, 1)[0];' 'var alt = MAILS[i];' 'zweiter Tipp ersetzt'
fall "TESTMAIL: der Hinweis sagt nicht mehr, dass es erfunden ist" assets/anhaenge.js \
  '"Eine erfundene Mail mit zwei' '"Eine Mail mit zwei' 'als erfunden'

fall "AUSSEN: die Mail wird nicht mehr auf KI-Anweisungen geprüft" assets/aussen.js \
  '      if (!f.length) return r;' '      return r;' 'hält beim ersten Tipp an'
fall "AUSSEN: ein zweiter Tipp geht nicht weiter" assets/aussen.js \
  '      if (bestaetigt[k]) return r;' '' 'zweiter Tipp geht trotzdem'
fall "AUSSEN: die Aufgabe steht nicht mehr im Systemkanal" assets/aussen.js \
  'q.body.system = system; ' '' 'Aufgabe im Systemkanal'
fall "AUSSEN: die Marke ist fest statt zufällig" assets/aussen.js \
  'crypto.getRandomValues(b);' '' 'im OpenAI-Protokoll'
fall "AUSSEN: assets/aussen.js wird nicht mehr nachgeladen" assets/ablehnung.js \
  'document.head.append(s);' '' 'aussen.js ist geladen'
fall "SICHER: die sichere Fassung nennt den KI-Fund als entfernt" assets/anhaenge.js \
  'var WEG_BEIM_ZEICHNEN = ["BILD-METADATEN",' 'var WEG_BEIM_ZEICHNEN = ["BILD-KI-ANWEISUNG", "BILD-METADATEN",' 'nur, was das Neuzeichnen'
fall "LESEN: das Beispiel im Eingang verspricht wieder Überschreiben" assets/aussen.js \
  'if (h && m && m.ordner === "eingang") {' 'if (h && m && m.ordner === "nie") {' 'kein Überschreiben'

# 📁 Postfach: Auswahl, Verschieben, Papierkorb, eigene Ordner (Klaus 2026-10-02)
fall "POSTFACH: assets/postfach.js wird nicht mehr nachgeladen" assets/ablehnung.js \
  'p.src = "assets/postfach.js";' 'p.src = "assets/fehlt.js";' 'nachgeladen'
fall "POSTFACH: der Klick nach einem langen Druck mit dem Finger wird nicht geschluckt" assets/postfach.js \
  '      if (schluckBis && Date.now() < schluckBis) { e.stopPropagation(); e.preventDefault(); }' '' 'Klick beim Loslassen hebt die Auswahl nicht auf'
fall "POSTFACH: ein neuer Druck löscht die Schluck-Marke nicht" assets/postfach.js \
  '    document.addEventListener("pointerdown", function () { schluckBis = 0; }, true);' '' 'wählt ein Tipp eine weitere Mail dazu'
fall "POSTFACH: ein langer Druck tut nichts" assets/postfach.js \
  '      }, LANGDRUCK);' '      }, 999999);' 'langer Druck wählt'
fall "POSTFACH: Löschen löscht sofort statt in den Papierkorb" assets/postfach.js \
  '    verschiebe(ms, PK);' '    endgueltig(ms, true);' 'Papierkorb, nicht weg'
fall "POSTFACH: Rückgängig holt nichts zurück" assets/postfach.js \
  'function () { zurueckholen(ms); });' 'function () {});' 'Rückgängig'
fall "POSTFACH: endgültig löschen fragt nicht" assets/postfach.js \
  'if (!ohneFrage && !confirm(' 'if (false && !confirm(' 'fragt vorher'
fall "POSTFACH: endgültig löschen bleibt nur im Speicher" assets/postfach.js \
  'ids.forEach(function (id) { dbTx("readwrite", function (s) { return s.delete(id); }); });' '' 'auch nach dem Neuladen'
fall "POSTFACH: Verschieben schreibt die ART um" assets/postfach.js \
  '      else { m.ablage = ziel; delete m.geloeschtAus; }' '      else { m.ablage = ziel; m.ordner = "entwurf"; delete m.geloeschtAus; }' 'ART|Art bleibt'
fall "POSTFACH: Verschieben speichert nicht" assets/postfach.js \
  '      jetztSpeichern(m);   // der Ort steht an der Mail' '      // nicht gespeichert' 'nach dem Neuladen liegen'
fall "POSTFACH: ein gelöschter Ordner nimmt seine Mails mit" assets/postfach.js \
  'drin.forEach(function (m) { delete m.ablage; jetztSpeichern(m); });' 'drin.forEach(function (m) { endgueltig([m], true); });' 'löscht keine Mail'
fall "POSTFACH: ein Ordnername wird als HTML gesetzt" assets/postfach.js \
  'el("span", { class: "t" }, name), el("span", { class: "zahl" }' '(function(){var s=document.createElement("span");s.className="t";s.innerHTML=name;return s;})(), el("span", { class: "zahl" }' 'nicht als HTML|kein innerHTML'
fall "POSTFACH: am Handy fehlt der Knopf Mehr" assets/postfach.js \
  '    bn.append(el("button", { type: "button", id: "ordner-mehr"' '    if (0) bn.append(el("button", { type: "button", id: "ordner-mehr"' 'fünf Knöpfe'

fall "NEULADEN: der Knopf wird nicht mehr nachgeladen" assets/sbkim-init.js \
  's.src = "assets/neuladen.js?v=1";' 's.src = "assets/fehlt.js";' 'steht sichtbar direkt vor dem'
fall "NEULADEN: der Knopf bekommt wieder Text" assets/neuladen.js \
  'z.textContent = "⟳";' 'z.textContent = "⟳ Aktualisieren";' 'nur das Zeichen, kein Text'
fall "NEULADEN: der eigene Vorrat bleibt liegen" assets/neuladen.js \
  'return caches.delete(n);' 'return n;' 'wirft den eigenen Vorrat weg'
fall "NEULADEN: fremde Vorräte werden mit weggeworfen" assets/neuladen.js \
  '.filter(function (n) { return EIGEN.test(n); })' '' 'fremde Vorr'
fall "NEULADEN: frisch= bleibt in der Adresszeile" assets/neuladen.js \
  '    adresseAufraeumen();' '' 'putzt .frisch='
fall "NEULADEN: unter 360 px bleibt der Knopf stehen" assets/neuladen.js \
  '@media (max-width:359px){#neuladen{display:none}}' '' 'unter 360 px fehlt'
fall "NEULADEN: der Knopf fehlt im Offline-Vorrat" sw.js \
  '"assets/neuladen.js?v=1", ' '' 'Neu-laden-Knopf steht im Offline'

fall "APPWEG: als App steht wieder der Knopf da" assets/installieren.js \
  'k.hidden = app; k.style.display = app ? "none" : "";' 'k.hidden = false;' 'der Installieren-Knopf ist nicht zu sehen'
fall "APPWEG: als App kommt wieder die Meldung" assets/installieren.js \
  'if (alsApp()) return;' 'if (alsApp()) { melde("App"); return; }' 'keine Meldung'

fall "SICHERUNG: Klartext statt verschlüsselt" assets/sicherung.js \
  'return T().zu(pw, JSON.stringify(inhalt)).then(function (paket) {' 'return Promise.resolve({v:1,salt:"x",iv:"x",ct:JSON.stringify(inhalt)}).then(function (paket) {' 'KEIN Klartext'
fall "SICHERUNG: Zurückholen überschreibt vorhandene Mails" assets/sicherung.js \
  'if (m && m.id && !da.has(m.id)) { da.add(m.id); neu.push(m); }' 'if (m && m.id) { var i = MAILS.findIndex(function (x) { return x.id === m.id; }); if (i >= 0) MAILS.splice(i, 1); neu.push(m); }' 'überschreibt nichts'
fall "SICHERUNG: Anhänge kommen als Text zurück" assets/sicherung.js \
  'x.blob = b64ZuBlob(a.b64, a.typ); delete x.b64;' 'x.blob = a.b64; delete x.b64;' 'samt Anhang'
fall "SICHERUNG: zwei verschiedene Passwörter gehen durch" assets/sicherung.js \
  'if (pw.value !== pw2.value) return melde(' 'if (0) return melde(' 'verschiedene Passw'
fall "SICHERUNG: zu kurzes Passwort geht durch" assets/sicherung.js \
  'if (pw.value.length < MIN_PW) return melde(' 'if (0) return melde(' 'zu kurzes Passwort'
fall "SICHERUNG: die letzte Sicherung wird nicht gemerkt" assets/sicherung.js \
  '        schreib(ZULETZT, d.erstellt);' '' 'Erinnerung ist weg'
fall "SICHERUNG: das Passwort bleibt im Feld stehen" assets/sicherung.js \
  '        pw.value = pw2.value = "";' '' 'Felder sind nach dem Sichern geleert'
fall "SICHERUNG: die Erinnerung kommt nie" assets/sicherung.js \
  'return eigene() > 0 && tageSeit() >= ERINNERN_TAGE && !spaeter;' 'return false;' 'Erinnerung'
fall "SICHERUNG: fehlt im Offline-Vorrat" sw.js \
  '"assets/sicherung.js", ' '' 'Offline-Vorrat'
fall "SICHERUNG: jetztSpeichern beim Zurückholen fehlt" assets/sicherung.js \
  'neu.forEach(function (m) { MAILS.push(m); try { jetztSpeichern(m); } catch (_e) {} });' 'neu.forEach(function (m) { MAILS.push(m); });' 'überlebt das Neuladen'

fall "EMPF: weitere Empfänger werden nicht mehr abgelegt" assets/empfaenger.js \
  'if (weitere.length) m.weitereNamen = weitere;' '' 'weitere Empfänger und Cc stehen'
fall "EMPF: Cc wird nicht mehr gelesen" assets/empfaenger.js \
  '["to", "cc"].forEach' '["to"].forEach' '\(\.eml\): weitere Empfänger'
fall "EMPF: mailNamen nimmt die weiteren nicht mit" assets/empfaenger.js \
  'altNamen(m).concat(w.map' 'altNamen(m).concat([].map' 'mailNamen nimmt sie mit'
fall "EMPF: Semikolon trennt nicht mehr" assets/empfaenger.js \
  '(c === "," || c === ";")' '(c === ",")' 'weitere Empfänger und Cc|mailNamen nimmt|keiner dieser Namen'
fall "EMPF: ein gepasteter An-Eintrag bleibt ganz im ersten Namen" assets/empfaenger.js \
  'if (m.anName && teile(m.anName).length > 1) {' 'if (false) {' 'gepastet): der erste Empfänger'
fall "EMPF: die Zeile Aus Von/An/Cc fehlt" assets/empfaenger.js \
  'e.textContent = "Aus Von/An/Cc: " + auto.join(", ");' '' 'Aus Von/An/Cc'
fall "EMPF: fehlt im Offline-Vorrat" sw.js \
  '"assets/empfaenger.js", ' '' 'Offline-Vorrat'

echo "$gefangen gefangen · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ $((blind+falsch+tot)) -eq 0 ]

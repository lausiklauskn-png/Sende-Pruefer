/*
 * smoke.mjs — der Sende-Prüfer im echten Browser.
 *
 * Gemessen wird, was ein Mensch erlebt: tippen, sehen, kopieren, senden.
 * Die zwei Anbieter werden mit `page.route` abgefangen — es geht KEIN Aufruf
 * ins Netz, und gemessen wird genau, was hinausgegangen WÄRE.
 *
 * Drei Ausgänge: ✓ grün · ✗ ROT · ⊘ nicht lauffähig (kein Browser/Paket).
 * `| tail` ist zum Lesen da, nicht zum Urteilen — über grün entscheidet der
 * Rückgabewert.
 */
import http from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findeChromium } from "./chromium-finden.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
let gruen = 0, rot = 0;
const ok = (satz, bed, info) => {
  if (bed) { gruen++; console.log("✓ " + satz); }
  else { rot++; console.log("✗ ROT: " + satz + (info !== undefined ? "  → " + info : "")); }
};
function ende() { console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0; }

let chromium;
try { ({ chromium } = await import("playwright-core")); }
catch { console.log("⊘ nicht lauffähig: playwright-core fehlt (npm install)"); process.exit(0); }
const exe = findeChromium();
if (!exe) { console.log("⊘ nicht lauffähig: kein Chromium gefunden"); process.exit(0); }

/* ── ohne Browser: Größe und Bauart ──────────────────────────────────────── */
const html = readFileSync(join(WURZEL, "sende-pruefer.html"), "utf8");
const groesse = ["sende-pruefer.html", "koeder.txt", "LIESMICH.md", "PROBE.md"]
  .reduce((s, f) => { try { return s + statSync(join(WURZEL, f)).size; } catch { return s; } }, 0);
/* 96 KB statt 48 KB: Klaus 2026-09-28 für das Postfach. Die Grenze gilt dem Code
   und der Anleitung, nicht den Mails — die liegen in IndexedDB auf dem Gerät. */
ok(`die vier Dateien zusammen unter 96 KB (${groesse} Bytes)`, groesse > 0 && groesse < 96 * 1024);
ok("keine fremde Quelle im Markup (src/href nach draußen außer Links zum Anklicken)",
  !/<(?:script|link|img|iframe)[^>]+(?:src|href)=["']https?:/i.test(html));
ok("kein Eingabefeld für eine Adresse (keine type=url, kein Feld namens adresse/url/endpoint)",
  !/<input[^>]+(?:type=["']url["']|id=["'](?:adresse|url|endpoint)["'])/i.test(html));
const anbieterBlock = readFileSync(join(WURZEL, "assets/anbieter.js"), "utf8");
const anbieterNamen = [...anbieterBlock.matchAll(/^    ([a-z]+): f\(\{/gm)].map((m) => m[1]);
ok("die Anbieter stehen als benannte, eingefrorene Liste in assets/anbieter.js",
  /window\.SPAnbieter = f\(\{/.test(anbieterBlock) && anbieterNamen.length >= 5, anbieterNamen.join(", "));
ok("Claude steht oben, Mistral ganz unten (Klaus 2026-09-29)",
  anbieterNamen[0] === "anthropic" && anbieterNamen[anbieterNamen.length - 1] === "mistral", anbieterNamen.join(", "));
ok("ChatGPT, Gemini und OpenRouter sind wählbar", ["openai", "gemini", "openrouter"].every((n) => anbieterNamen.includes(n)));
const vonNamen = (anbieterBlock.match(/adresse: "https:\/\//g) || []).length;
ok("je Anbieter genau eine Adresse, ein Modell und eine Schlüssel-Seite",
  vonNamen === anbieterNamen.length && (anbieterBlock.match(/modell: "/g) || []).length === anbieterNamen.length
  && (anbieterBlock.match(/holen: "https:/g) || []).length === anbieterNamen.length);
const ki = /https:\/\/(?:api\.[a-z.]+|generativelanguage\.googleapis\.com|openrouter\.ai\/api)\/[a-z0-9/.]+/g;
ok("die Seite selbst trägt keine KI-Adresse — sie stehen nur in der Liste",
  !ki.test(html) && !/const ANBIETER = Object\.freeze\(\{\s*\w+:/.test(html));
ok("die Seite lädt die Liste vor dem eigenen Skript",
  html.indexOf('src="assets/anbieter.js"') > 0 && html.indexOf('src="assets/anbieter.js"') < html.indexOf("const ANBIETER = window.SPAnbieter"));
ok("die neueren OpenAI-Modelle bekommen max_completion_tokens statt max_tokens",
  /openai: f\(\{[^}]*grenze: "max_completion_tokens"/.test(anbieterBlock) && /\[a\.grenze \|\| "max_tokens"\]: 4096/.test(html));
const liesmich = readFileSync(join(WURZEL, "LIESMICH.md"), "utf8");
const grenzen = ((liesmich.split(/## Grenzen/)[1] || "").split(/\n## /)[0].match(/^\d+\. /gm) || []).length;
ok(`LIESMICH nennt mindestens fünf Grenzen (${grenzen})`, grenzen >= 5);
ok("LIESMICH nennt vor der Bedienung zwei Fälle, in denen man zur Seite greift",
  liesmich.indexOf("## Wann man dazu greift") > -1
  && liesmich.indexOf("## Wann man dazu greift") < liesmich.indexOf("## So geht es")
  && (liesmich.split("## Wann man dazu greift")[1].split("## So geht es")[0].match(/\*\*\d · /g) || []).length >= 2);

/* ── der Prüfkern ist Sage-Modul 25, byte-1:1 (seit 2026-09-28) ─────────────
   Wer das Modul in Sage ändert, kopiert es neu und zieht MODUL25_SHA nach.
   Eine Abwandlung HIER wäre eine zweite Fassung, die niemand prüft. */
const MODUL25 = "modules/25_pseudonym.js";
const MODUL25_SHA = "7a70fb022130d1f8275e6467b82b9a60370d1f7ce2fe9fc8e0370a735ce1eba2";
const modulBytes = (() => { try { return readFileSync(join(WURZEL, MODUL25)); } catch { return null; } })();
ok("Modul 25 liegt bei (" + MODUL25 + ")", !!modulBytes);
ok("Modul 25 ist unverändert (SHA-256 gepinnt)",
  !!modulBytes && createHash("sha256").update(modulBytes).digest("hex") === MODUL25_SHA);
const sageKopie = join(WURZEL, "..", "Sage-Protokol", "src", "modules", "25_pseudonym.js");
if (existsSync(sageKopie)) ok("… und byte-gleich mit Sage-Protokol daneben", !!modulBytes && readFileSync(sageKopie).equals(modulBytes));
else console.log("⊘ Sage-Protokol liegt nicht daneben — der Vergleich mit Sage ist hier nicht messbar");
ok("die Seite lädt Modul 25 vor ihrem eigenen Skript",
  html.indexOf('<script src="' + MODUL25 + '">') > -1 && html.indexOf('<script src="' + MODUL25 + '">') < html.indexOf("<script>\n"));
ok("die Seite trägt keine eigenen Erkennungs-Muster mehr (keine zweite Fassung)",
  !/const (?:SCHLUESSEL_MUSTER|IBAN_FORM|BETRAG|TELEFON|BELEG_FREI|MAIL) =/.test(html));

/* ── der SBKIM-Knoten: 13 Module + Wizard, byte-1:1 aus Sage (seit 2026-09-29) ──
   Klaus: „das komplette Siegel einbauen … oben in der Navi-Leiste verankert".
   Wer ein Modul in Sage ändert, kopiert es neu und zieht den Pin nach. */
const KNOTEN_PINS = {
  "01_storage.js": "5a5a4bf64dfcc107da7ed70fb755d7db5cce7d80e963b3e2fbc2004537747820",
  "02_spore.js": "6789fe6e903ad2e53f39b2dee576c640698555ef71ef4e9134eb75573fdb7d68",
  "03_embedding.js": "e4bb8bd6a237914e7841cab5165912daf636adf0ee90c5d4ffd0c74cc5d706e5",
  "04_match.js": "5de95923c3f62f141e94f576feebcac0eecc55c60e40b564540a56420436a4cd",
  "05_anastomose.js": "255ac79aeb3b0203e92f0cebd0a905e47c488b43efe18f41332a7d35520bbf23",
  "05b_nostr_relay.js": "030aa2d260149f5627b84694a0b55e916cc186158009e260117d1e4f60d429bd",
  "07_apoptose.js": "0acdd6ab2d95e131fa6953061cc0e95a2396e05fff091a7dc690b2668a4c035a",
  "15_membran.js": "829a5bc01976b59c5ce428125314b87b314b6212cd5a473634c2d22c02579397",
  "16_siegel.js": "d84fa539e76e0cc54c956b648fcb1505f08843662d97854dc1a95e6ab65b7e25",
  "16b_andock_wizard.js": "c415eafdb1b660a5256e19957c667074b64b0c3990cc8acc4daeeef34a57e85d",
  "23_rendezvous.js": "3caa0bb1fbe7bf5293c90b6a59a74cccf8600bff45095a892b1f048244c61fcf",
  "23_rendezvous_ui.js": "f6c44607a797a4acc34bf5eafa4d72dba0af890701d587394afed1accf9833eb",
  "noble-secp256k1.js": "8f3879ca422c4fdfe7ca0361688636fa7cc550a59bd94d512ed6ec79aa3d55d1",
};
for (const [datei, sha] of Object.entries(KNOTEN_PINS)) {
  const b = (() => { try { return readFileSync(join(WURZEL, "modules", datei)); } catch { return null; } })();
  ok("modules/" + datei + " ist unverändert (SHA-256 gepinnt)", !!b && createHash("sha256").update(b).digest("hex") === sha);
  const neben = join(WURZEL, "..", "Sage-Protokol", "src", "modules", datei);
  if (existsSync(neben)) ok("… und byte-gleich mit Sage-Protokol daneben", !!b && readFileSync(neben).equals(b));
}
/* ── das Schloss für den KI-Schlüssel: byte-1:1 aus kim-hub-company (1a4528d) ── */
const TRESOR_SHA = "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666";
{ const b = (() => { try { return readFileSync(join(WURZEL, "assets", "schluesseltresor.js")); } catch { return null; } })();
  ok("assets/schluesseltresor.js ist unverändert (SHA-256 gepinnt)", !!b && createHash("sha256").update(b).digest("hex") === TRESOR_SHA);
  const neben = join(WURZEL, "..", "kim-hub-company", "schluesseltresor.js");
  if (existsSync(neben)) ok("… und byte-gleich mit kim-hub-company daneben", !!b && readFileSync(neben).equals(b)); }
ok("Schloss und Tresor stehen im Offline-Vorrat",
  /"assets\/schluesseltresor\.js"/.test(readFileSync(join(WURZEL, "sw.js"), "utf8")) && /"assets\/tresor-ui\.js"/.test(readFileSync(join(WURZEL, "sw.js"), "utf8")));
ok("die Seite schreibt den Schlüssel nirgends offen in den Speicher", !/schreib\(schluesselName\(\), (?!"")/.test(html));
ok("Modul 17 (das fliegende Widget) liegt NICHT mehr bei — die Leiste steht fest im Kopf",
  !existsSync(join(WURZEL, "modules", "17_floating_widget.js")) && !/17_floating_widget/.test(html + readFileSync(join(WURZEL, "assets", "sbkim-init.js"), "utf8")));
const glue = readFileSync(join(WURZEL, "assets", "sbkim-init.js"), "utf8");
const kette = [...((glue.match(/var KANON = \[([\s\S]*?)\];/) || [])[1] || "").matchAll(/"((?:modules|assets)\/[^"]+)"/g)].map((m) => m[1]);
const soll = ["01_storage", "02_spore", "03_embedding", "04_match", "05_anastomose", "07_apoptose", "15_membran", "16_siegel", "05b_nostr_relay", "23_rendezvous", "23_rendezvous_ui", "siegel-inhalt", "16b_andock_wizard"];
ok("die Kette nennt alle 13 Pflicht-Module und den Wizard, in kanonischer Reihenfolge",
  kette.length === soll.length && soll.every((n, i) => kette[i].includes(n + ".js")), kette.join(" "));
ok("05b läuft als ES-Modul (sonst leuchtet das Siegel, während der Raum tot ist)", /\["module",\s*"modules\/05b_nostr_relay\.js"\]/.test(glue));
ok("zwischen den Gliedern der Kette steht jedes Komma (sonst ist [..] [..] ein Index-Zugriff)",
  !/\]\s*\n\s*\[/.test((glue.match(/var KANON = \[([\s\S]*?)\];/) || [])[1] || ""));
const kopfTeil = html.split("</head>")[0];
ok("die eigene Schublade sendepruefer steht im <head> (Modul 01 liest sie beim Laden)",
  /<script>window\.SBKIM_DB_SUFFIX = "sendepruefer";<\/script>/.test(kopfTeil) && /dbSuffix: "sendepruefer"/.test(glue));
ok("die Membran erlaubt keine fremde Herkunft (allowedOrigins leer)", /allowedOrigins: \[\]/.test(glue));
ok("das Siegel hängt am festen Platz in der Kopfleiste und trägt ein Band", /badgeSelector: "#siegel-platz"/.test(glue) && /ribbonText: "SENDE-PRÜFER"/.test(glue));
const wizInhalt = readFileSync(join(WURZEL, "assets", "siegel-inhalt.js"), "utf8");
const beschreibung = (wizInhalt.match(/domainDescription: "([^"]*)"/) || [])[1] || "";
ok("die Bedeutungs-Beschreibung beginnt mit dem eigenen Namen", /^Der Sende-Prüfer /.test(beschreibung));
ok("… nennt Zweck, SBKIM-Protokoll, Sage-Protokol und dass er ein Knoten ist",
  /ZWECK/.test(beschreibung) && /SBKIM-Protokoll/.test(beschreibung) && /Sage-Protokol/.test(beschreibung) && /Knoten/.test(beschreibung));
ok("… und sagt, was er NICHT ist (kein Virenscanner)", /kein Virenscanner/.test(beschreibung));
const manifest = JSON.parse(readFileSync(join(WURZEL, "manifest.json"), "utf8"));
ok("installiert öffnet es als eigenes Fenster mit Minimieren · Verkleinern · Schließen (display: standalone)",
  manifest.display === "standalone" && !manifest.display_override);
ok("die Erklärseite des Siegels (sicherheit.html) liegt da und steht im Offline-Vorrat",
  existsSync(join(WURZEL, "sicherheit.html")) && readFileSync(join(WURZEL, "sw.js"), "utf8").includes('"sicherheit.html"') && /iframe\.src = "sicherheit\.html"/.test(readFileSync(join(WURZEL, "modules/16b_andock_wizard.js"), "utf8")));
ok("die Anbieter-Liste steht im Offline-Vorrat", readFileSync(join(WURZEL, "sw.js"), "utf8").includes('"assets/anbieter.js"'));
ok("Modul 25 steht im Offline-Vorrat", readFileSync(join(WURZEL, "sw.js"), "utf8").includes('"' + MODUL25 + '"'));

/* ── Handbuch (Klaus 2026-09-29): gebaut aus der echten App, Szene für Szene ── */
const hb = existsSync(join(WURZEL, "handbuch.html")) ? readFileSync(join(WURZEL, "handbuch.html"), "utf8") : "";
const hbJson = existsSync(join(WURZEL, "handbuch", "szenen.json")) ? JSON.parse(readFileSync(join(WURZEL, "handbuch", "szenen.json"), "utf8")).szenen : [];
const { SZENEN } = await import(new URL("../tools/handbuch-szenen.mjs", import.meta.url));
ok("oben in der Kopfleiste steht ? und führt zum Handbuch",
  /<a class="rund" id="hilfe" href="handbuch\.html"[^>]*>\?<\/a>/.test(html.split("</header>")[0]));
ok("das Handbuch ist gebaut und trägt jede Szene der Liste (sonst ist es veraltet: node tools/handbuch-bauen.mjs)",
  SZENEN.length >= 8 && hbJson.length === SZENEN.length && SZENEN.every((z) => hb.includes('data-szene="' + z.id + '"') && hb.includes(z.sprech.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"))),
  SZENEN.length + " / " + hbJson.length);
ok("… jedes Bild liegt da, und jede Szene hat einen Sprechtext fürs Video",
  hbJson.length > 0 && hbJson.every((z) => existsSync(join(WURZEL, z.bild)) && hb.includes('src="' + z.bild + '"') && z.sprech.length > 30));
ok("… jeder Leuchtring liegt im Bild", hbJson.length > 0 && hbJson.every((z) => z.ring.w > 0 && z.ring.h > 0 && z.ring.x + z.ring.w <= 100.1 && z.ring.y + z.ring.h <= 100.1),
  JSON.stringify(hbJson.map((z) => z.ring)));
ok("… holt nichts aus dem Netz (keine fremde Adresse in src oder href)", hb.length > 0 && !/(?:src|href)="https?:/i.test(hb));
ok("… und liest nur mit einer Stimme auf dem Gerät vor (localService)", /v\.localService/.test(hb));
/* ── Anleitung und Grenzen als Seite (Klaus 2026-09-29): gebaut aus LIESMICH.md ── */
const anlPfad = join(WURZEL, "anleitung.html");
const anl = existsSync(anlPfad) ? readFileSync(anlPfad, "utf8") : "";
const anlBau = await import(pathToFileURL(join(WURZEL, "tools", "anleitung-bauen.mjs")).href);
ok("anleitung.html ist genau das, was aus LIESMICH.md gebaut wird (sonst: node tools/anleitung-bauen.mjs)",
  anl.length > 0 && anl === anlBau.bauen(liesmich));
const anlGrenzen = ((anl.split('<ol class="grenzen">')[1] || "").split("</ol>")[0].match(/<li>/g) || []).length;
ok(`… trägt jede Grenze aus LIESMICH.md (${anlGrenzen} von ${grenzen})`, grenzen >= 5 && anlGrenzen === grenzen);
ok("… jede Sorte der Tabelle steht als Zeile da",
  ["SCHLUESSEL", "MAIL", "TELEFON", "IBAN", "BETRAG", "RECHNUNG", "NAME"].every((x) => anl.includes('<span class="sorte">' + x + "</span>")));
ok("… Text wird maskiert, nicht als HTML gelesen",
  !/<b>x<\/b>|<script/.test(anlBau.bauen("# T\n\n## A\n\nein <b>x</b> <script>y</script>")) && /&lt;b&gt;x/.test(anlBau.bauen("# T\n\n## A\n\nein <b>x</b>")));
ok("… holt nichts aus dem Netz", anl.length > 0 && !/(?:src|href)="https?:/i.test(anl));
ok("die Seite verlinkt „Anleitung und Grenzen“ auf die gestaltete Seite, nicht auf die Rohdatei",
  /<a href="anleitung\.html">Anleitung und Grenzen<\/a>/.test(html) && !/href="LIESMICH\.md"/.test(html));
ok("… das Handbuch ebenso", /<a class="knopf" href="anleitung\.html">Anleitung und Grenzen<\/a>/.test(hb) && !/href="LIESMICH\.md"/.test(hb));
ok("die Anleitung steht im Offline-Vorrat", readFileSync(join(WURZEL, "sw.js"), "utf8").includes('"anleitung.html"'));
/* ── Icons und das große Bild (Klaus 2026-09-29) ── */
const mIcons = (manifest.icons || []);
ok("das Manifest nennt 192, 512 und ein maskierbares Icon, und alle Dateien liegen da",
  ["192x192", "512x512"].every((g) => mIcons.some((i) => i.sizes === g && i.purpose === "any")) && mIcons.some((i) => i.purpose === "maskable")
  && mIcons.every((i) => existsSync(join(WURZEL, i.src))), JSON.stringify(mIcons));
ok("Favicon und Apple-Icon stehen im Kopf der Seite und liegen da",
  /<link rel="icon" href="icons\/favicon-32\.png"/.test(kopfTeil) && /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/.test(kopfTeil)
  && ["favicon-32.png", "favicon-48.png", "apple-touch-icon.png", "marke-72.png", "sende-pruefer-bild.webp", "sende-pruefer-bild-gross.webp"].every((f) => existsSync(join(WURZEL, "icons", f))));
/* Klaus 2026-09-29: den Weg hat er im Lichtweg-Werkzeug selbst gezogen (tools/lichtweg.mjs,
   WEG). Gemessen wird am CSS der SEITE, nicht am Werkzeug — sonst wäre eine Handänderung
   an der Seite unsichtbar. Dazu, dass beide Dateien genau den gebauten Block tragen. */
const lwBlock = (t) => (t.match(/\/\* LICHTWEG-ANFANG[\s\S]*?\/\* LICHTWEG-ENDE \*\//) || [""])[0];
const lw = await import(pathToFileURL(join(WURZEL, "tools", "lichtweg.mjs")).href);
ok("der Lichtweg in Seite und Handbuch ist genau der gebaute (node tools/lichtweg.mjs)",
  lwBlock(html) === lw.cssBlock() && lwBlock(readFileSync(join(WURZEL, "tools", "handbuch-vorlage.html"), "utf8")) === lw.cssBlock());
const lwWeg = [...((html.match(/@keyframes licht-weg\{(.*?)\}\}/) || ["", ""])[1] + "}").matchAll(/([\d.]+)%\{left:([\d.]+)%;top:([\d.]+)%\}/g)]
  .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
const nahe = (p, q) => p && Math.hypot(p[1] - q[0], p[2] - q[1]) < 1;
ok("… folgt Klaus' Weg: Start unten links, durch die Mitte, Ende oben rechts",
  lwWeg.length > 20 && nahe(lwWeg[0], lw.WEG.start) && nahe(lwWeg[lwWeg.length - 1], lw.WEG.ende) && lwWeg.some((p) => nahe(p, lw.WEG.mitte)),
  `${lwWeg.length} Punkte`);
const lwAbst = lwWeg.slice(1).map((p, i) => Math.hypot(p[1] - lwWeg[i][1], p[2] - lwWeg[i][2]));
ok("… läuft ohne Halt: gleicher Abstand je Schritt, linear abgespielt",
  lwAbst.length > 0 && Math.max(...lwAbst) / Math.min(...lwAbst) < 1.3 && /animation:licht-weg [\d.]+s linear infinite/.test(html),
  lwAbst.length ? `${Math.min(...lwAbst).toFixed(2)}–${Math.max(...lwAbst).toFixed(2)}` : "kein Weg");
const kg = (html.match(/@keyframes kegel\{(.*?)\}\}/) || ["", ""])[1] + "}";
const skalen = [...kg.matchAll(/([\d.]+)%\{scale:([\d.]+)(?: ([\d.]+))?/g)].map((m) => ({ t: Number(m[1]), x: Number(m[2]), y: Number(m[3] || m[2]) }));
const beiT = (t) => skalen.find((s) => Math.abs(s.t - t) < 0.2);
ok("… blitzt am Start und am Ende mindestens vierfach auf",
  (beiT(0)?.x ?? 0) >= 4 && (beiT(100)?.x ?? 0) >= 4, kg);
ok("… nimmt in der Mitte die ganze Höhe des Icons ein",
  skalen.some((s) => s.t > 30 && s.t < 70 && s.x >= 4 && s.y * 14 >= 99), kg);
ok("… und wird dazwischen wieder klein", skalen.filter((s) => s.x === 1 && s.y === 1).length >= 2, kg);
ok("… läuft doppelt so schnell wie zuerst (3,5 statt 7 Sekunden)",
  lw.DAUER === 3.5 && /animation:licht-weg 3\.5s linear infinite,kegel 3\.5s/.test(html));
/* Klaus 2026-09-29: steht der Schein in der Mitte, strahlt der Boden kurz zurück — in
   Schild-Breite, und zwar die hellen, farbigen Streifen der Spiegelung, kein Fleck. */
const vorher = (html.match(/\.bild-buehne::before\{[^}]*\}/) || [""])[0];
const boden = [...vorher.matchAll(/radial-gradient\(([\d.]+)% ([\d.]+)% at 50% (\d+)%/g)].find((m) => Number(m[3]) >= 80);
ok("… und in der Mitte strahlt der Boden kurz zurück, in Schild-Breite: die hellen Streifen des Bildes leuchten heller",
  !!boden && Number(boden[3]) >= 80 && Number(boden[1]) * 2 >= 30 && /animation:aufleuchten/.test(vorher)
  && /url\(icons\/sende-pruefer-bild\.webp\) 0 0\/100% 100%/.test(vorher) && /mix-blend-mode:plus-lighter/.test(vorher)
  && /(^|;)mask:[^;]*at 50% [89]\d%/.test(vorher.replace(/^[^{]*\{/, "")), vorher.slice(0, 120));
/* Klaus 2026-09-29: das Icon hängt lose wie die Wackel-Knöpfe in family-project; der
   Schein spielt die Maus. Die Stelle, auf die er fällt, gibt nach hinten nach. */
const wk = [...((html.match(/@keyframes wackeln\{(.*?)\}\}/) || ["", ""])[1] + "}").matchAll(/([\d.]+)%\{transform:perspective\(\d+px\) rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)\}/g)]
  .map((m) => ({ t: Number(m[1]), rx: Number(m[2]), ry: Number(m[3]) }));
const zuPunkt = (w) => lwWeg.find((p) => Math.abs(p[0] - w.t) < 0.01);
const passt = wk.filter((w) => w.t > 12 && w.t < 88).every((w) => { const p = zuPunkt(w);
  return p && (Math.abs(p[1] - 50) < 5 || Math.sign(w.ry) === Math.sign(p[1] - 50)) && (Math.abs(p[2] - 50) < 5 || Math.sign(w.rx) === Math.sign(50 - p[2])); });
ok("das Icon wackelt genau an der Stelle, auf die der Schein fällt (sie gibt nach hinten nach)",
  wk.length === lwWeg.length && passt, `${wk.length} Stellungen`);
ok("… sichtbar weit, in der Mitte kaum, und am Anfang und Ende wieder gerade",
  wk.length > 0 && Math.max(...wk.map((w) => Math.abs(w.ry))) >= 6
  && wk.filter((w) => zuPunkt(w) && nahe(zuPunkt(w), lw.WEG.mitte)).every((w) => Math.abs(w.rx) < 3 && Math.abs(w.ry) < 3)
  && wk[0].rx === 0 && wk[0].ry === 0 && wk[wk.length - 1].rx === 0 && wk[wk.length - 1].ry === 0);
ok("… und das Schweben stört das Wackeln nicht (Schweben über translate, beides zugleich)",
  /\.bild-buehne\{animation:var\(--wackeln\),schweben /.test(html) && /@keyframes schweben\{0%,100%\{translate:0 0\}50%\{translate:0 -8px\}\}/.test(html));
ok("… auch im Handbuch steht das Icon bei „weniger Bewegung“ still",
  /prefers-reduced-motion:reduce\)\{\.bild-buehne\{animation:none\}\}/.test(readFileSync(join(WURZEL, "tools", "handbuch-vorlage.html"), "utf8")));
ok("… und steht bei „weniger Bewegung“ still", /prefers-reduced-motion:reduce\)\{\.bild-buehne::after,\.bild-buehne::before\{animation:none/.test(html));
ok("das Handbuch steht im Offline-Vorrat", /"handbuch\.html"/.test(readFileSync(join(WURZEL, "sw.js"), "utf8")));

/* ── Server auf Port 0 — ein fester Port kollidiert mit einem zweiten Lauf ─ */
const TYP = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
  ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const server = http.createServer((q, a) => {
  const p = decodeURIComponent(new URL(q.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
  try { const b = readFileSync(join(WURZEL, p)); a.writeHead(200, { "content-type": TYP[extname(p)] || "application/octet-stream" }); a.end(b); }
  catch { a.writeHead(404); a.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASIS = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: exe });
try {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASIS.slice(0, -1) });
  const page = await ctx.newPage();

  /* Jeder Aufruf nach draußen wird mitgeschrieben. Die zwei Anbieter
     antworten gestellt, alles andere wird abgewiesen. */
  const draussen = []; let limitZahl = 0;
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const q = route.request();
    draussen.push({ url: q.url(), headers: q.headers(), body: q.postData() || "" });
    if (q.url().startsWith("https://api.anthropic.com/")) {
      const txt = JSON.parse(q.postData()).messages[0].content;
      const ph = (txt.match(/⟦NAME-1⟧/) || [""])[0];
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: `Liebe ${ph}, die Summe ⟦BETRAG-1⟧ ist erledigt.` }] }) });
    }
    if (q.url().startsWith("https://api.mistral.ai/") && /TARIF/.test(q.headers().authorization || ""))
      return route.fulfill({ status: 403, contentType: "application/json",   // wortgleich Klaus' Befund 2026-09-29
        body: JSON.stringify({ message: "This model is not available in your subscription tier" }) });
    if (q.url().startsWith("https://api.mistral.ai/") && /LIMIT/.test(q.headers().authorization || "")) {
      limitZahl++;                                  // wortgleich Klaus' Befund 2026-09-29
      if (/IMMER/.test(q.headers().authorization) || limitZahl === 1)
        return route.fulfill({ status: 429, contentType: "application/json",
          headers: { "retry-after": "1", "access-control-expose-headers": "retry-after" },
          body: JSON.stringify({ message: "Rate limit exceeded" }) });
    }
    if (q.url().startsWith("https://generativelanguage.googleapis.com/") && /FEHL/.test(q.headers().authorization || ""))
      return route.fulfill({ status: 400, contentType: "application/json",   // Gemini antwortet mit einer LISTE
        body: JSON.stringify([{ error: { code: 400, message: "API key not valid. Please pass a valid API key." } }]) });
    if (q.url().startsWith("https://api.openai.com/"))
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "Gruß an ⟦MAIL-1⟧." } }] }) });
    if (q.url().startsWith("https://api.mistral.ai/"))
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "Bitte an ⟦MAIL-1⟧ antworten." } }] }) });
    return route.abort();
  });

  const bereit = (p) => p.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  /* Ordner wählen: am Handy über die Leiste unten, sonst links. */
  const geheOrdner = async (p, id) => { const unten = p.locator(`#bottomnav [data-ordner="${id}"]`);
    await ((await unten.isVisible()) ? unten : p.locator(`#ordnerliste [data-ordner="${id}"]`)).click(); };
  const verfassen = async (p) => { const f = p.locator("#fab"); await ((await f.isVisible()) ? f : p.locator("#neu")).click(); await p.waitForSelector("#text"); };
  const sichtbar = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.checkVisibility(); }, sel);
  await page.goto(BASIS + "index.html");
  await page.waitForFunction(() => location.pathname.endsWith("sende-pruefer.html"));
  await bereit(page);
  ok("index.html leitet auf die Seite weiter", page.url().endsWith("sende-pruefer.html"));
  await page.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
  ok("beim Laden geht kein Aufruf nach draußen, auch nicht, wenn der Knoten gestartet ist", draussen.length === 0, draussen.map((d) => d.url).join(", "));

  /* ── das Postfach: Ordner, Beispiele beim ersten Öffnen ─────────────── */
  const ordner = await page.evaluate(() => [...document.querySelectorAll("#ordnerliste [data-ordner]")].map((e) => e.dataset.ordner));
  ok("vier Ordner: Eingefügt · Entwürfe · KI-Antworten · Exportiert", JSON.stringify(ordner) === '["eingang","entwurf","antwort","export"]', ordner.join(","));
  const saat = await page.evaluate(() => window.SendePruefer.mails().map((m) => m.bid + "@" + m.ordner).sort());
  ok("beim ersten Öffnen liegen die drei Beispiele da", JSON.stringify(saat) === '["eva@entwurf","jonas@eingang","petra@eingang"]', saat.join(","));
  ok("jede Zeile im Postfach trägt ihre Schutz-Zahl und die Marke „Beispiel“",
    await page.evaluate(() => [...document.querySelectorAll("#liste .zeile")].every((z) => z.querySelector("[data-anzahl-chip]") && /Beispiel/.test(z.textContent))));

  /* Zweck zuerst: der erste Satz sagt, was ein Nutzer davon hat. */
  const zweck = await page.evaluate(() => {
    const z = document.querySelector("[data-zweck]"), s = document.querySelector("#lesen");
    return { text: z && z.textContent, vor: z && s && !!(z.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  ok("der Zweck steht vor der Bedienung und nennt, wovor die Seite schützt",
    zweck.vor && /Kunden/.test(zweck.text || "") && /nicht beim KI-Anbieter/.test(zweck.text || ""));

  /* ── ein eigener Entwurf ─────────────────────────────────────────────── */
  await page.click("#fab");
  await page.waitForSelector("#text");
  ok("Verfassen öffnet einen leeren Entwurf in „Entwürfe“",
    await page.evaluate(() => document.querySelector('#ordnerliste [data-ordner="entwurf"]').getAttribute("aria-current") === "true"));
  ok("an einer eigenen Mail steht kein Beispiel-Hinweis", !(await page.$("[data-beispiel-meldung]")));
  ok("ohne Namen sagt die Seite, dass kein Name verdeckt wird", await sichtbar(page, "[data-ohne-namen]"));
  await page.click("#ki-oeffnen");
  const felder = await page.evaluate(() => ["data-namen-zweck", "data-schluessel-zweck"].map((m) => {
    const e = document.querySelector("[" + m + "]"); return e ? e.textContent : "";
  }));
  ok("das Namen-Feld sagt in seinem ersten Satz, wozu es da ist", /damit|dann ebenfalls verdeckt/i.test(felder[0]));
  ok("das Schlüssel-Feld sagt, wozu es da ist", /Damit/.test(felder[1]));

  /* Die zwei Wege: gleichrangig, nebeneinander, jeder mit seinem Wofür. */
  const wege = await page.evaluate(() => ["#s-kopieren", "#s-senden"].map((s) => {
    const r = document.querySelector(s).getBoundingClientRect(); return { w: r.width, t: r.top };
  }));
  const wegeTexte = await page.evaluate(() => [...document.querySelectorAll("[data-weg-zweck]")].map((e) => e.textContent));
  ok("Kopieren nennt das eigene KI-Abo, ohne Schlüssel und ohne Zusatzkosten",
    /eigenes KI-Abo/.test(wegeTexte[0] || "") && /ohne Schlüssel/.test(wegeTexte[0] || "") && /ohne zusätzliche Kosten/.test(wegeTexte[0] || ""));
  ok("Senden nennt: ohne Fenster zu wechseln, kostet, was der Schlüssel kostet",
    /ohne Fenster zu wechseln/i.test(wegeTexte[1] || "") && /es kostet, was Ihr Schlüssel kostet/.test(wegeTexte[1] || ""));
  ok("kein Weg ist als „stattdessen“ beschriftet", !/stattdessen/i.test(await page.evaluate(() => document.querySelector(".zwei").textContent)));
  ok("beide Karten sind gleich breit", Math.abs(wege[0].w - wege[1].w) < 2, JSON.stringify(wege));
  ok("am Handy stehen die zwei Wege untereinander", wege[1].t > wege[0].t + 20, JSON.stringify(wege));
  await page.setViewportSize({ width: 1200, height: 900 });
  const breit = await page.evaluate(() => ["#s-kopieren", "#s-senden"].map((s) => document.querySelector(s).getBoundingClientRect().top));
  ok("auf breitem Schirm stehen sie nebeneinander", Math.abs(breit[0] - breit[1]) < 2, JSON.stringify(breit));
  ok("auf breitem Schirm stehen Ordner, Liste und Mail nebeneinander",
    await page.evaluate(() => ["nav.ordner", "section.liste", "main.lesen"].map((s) => document.querySelector(s).getBoundingClientRect())
      .every((r, i, a) => r.width > 60 && (i === 0 || r.left >= a[i - 1].right - 1))));
  /* Klaus 2026-09-28: „die komplette Bildfläche immer einnehmen“ — auf jedem
     Schirm, auch sehr breit. Gemessen wird die Fläche, nicht die CSS-Zeile. */
  for (const [w, h] of [[1920, 1080], [2560, 1440], [1024, 700]]) {
    await page.setViewportSize({ width: w, height: h });
    const f = await page.evaluate(() => { const r = document.getElementById("app").getBoundingClientRect();
      return { l: r.left, t: r.top, w: r.width, h: r.height, rechts: document.querySelector("main.lesen").getBoundingClientRect().right }; });
    ok(`bei ${w}×${h} füllt das Postfach die ganze Bildfläche`,
      f.l === 0 && f.t === 0 && Math.abs(f.w - w) < 1 && Math.abs(f.h - h) < 1 && Math.abs(f.rechts - w) < 1, JSON.stringify(f));    /* Klaus 2026-09-29, mit Gmail daneben: die Mail nutzt die Breite noch nicht.
       Jeder sichtbare Kasten im Lesebereich reicht bis an dessen rechten Innenrand. */
    const k = await page.evaluate(() => { const m = document.querySelector("main.lesen"), r = m.getBoundingClientRect();
      const innen = r.left + m.clientWidth - parseFloat(getComputedStyle(m).paddingRight);
      const b = [...m.querySelectorAll(".kasten,.blatt,.feldzeile,.namen,.funde")].filter((e) => !e.closest(".zwei>*") && e.checkVisibility() && e.getBoundingClientRect().width > 0);
      return { n: b.length, innen: Math.round(innen), kurz: b.filter((e) => e.getBoundingClientRect().right < innen - 2).map((e) => e.className + ":" + Math.round(e.getBoundingClientRect().right)) }; });
    ok(`bei ${w}×${h} nutzt die Mail die ganze Breite des Lesebereichs`, k.n > 2 && k.kurz.length === 0, JSON.stringify(k));
  }
  await page.setViewportSize({ width: 420, height: 900 });

  const text = "Frau Erika Musterfrau schreibt von erika@beispiel.test.\n" +
    "Offen sind 1.248,50 EUR aus RE-2026-04871.\nNochmal: erika@beispiel.test\nRückruf +49 30 1234567";
  await page.fill("#text", text);
  await page.fill("#namen", "Erika Musterfrau");
  await page.click('[data-sicht="ki"]');
  const befund = await page.evaluate(() => ({
    zahl: document.getElementById("anzahl").textContent,
    li: [...document.querySelectorAll("#befunde li")].map((l) => l.dataset.sorte + "@" + l.dataset.zeile),
    verdeckt: document.getElementById("verdeckt").textContent,
    hinweis: document.querySelector("[data-ohne-namen]").checkVisibility(),
  }));
  ok("mit Namen verschwindet der Hinweis", befund.hinweis === false);
  ok("der Befund erscheint beim Tippen, mit Zahl", befund.zahl === "6", befund.zahl);
  ok("jeder Befund trägt Sorte und Zeile",
    JSON.stringify(befund.li) === JSON.stringify(["NAME@1", "MAIL@1", "BETRAG@2", "RECHNUNG@2", "MAIL@3", "TELEFON@4"]), befund.li.join(" "));
  ok("derselbe Wert trägt denselben Platzhalter",
    (befund.verdeckt.match(/⟦MAIL-1⟧/g) || []).length === 2 && !/⟦MAIL-2⟧/.test(befund.verdeckt));
  ok("der Betrag mit Tausenderpunkt ist GANZ verdeckt — kein „1.“ davor",
    /Offen sind ⟦BETRAG-1⟧ aus/.test(befund.verdeckt), befund.verdeckt.split("\n")[1]);
  const werte = ["Erika Musterfrau", "erika@beispiel.test", "1.248,50", "248,50", "RE-2026-04871", "1234567"];
  ok("die verdeckte Fassung enthält keinen der Werte", werte.every((w) => !befund.verdeckt.includes(w)));
  ok("„Was die KI sieht“ trägt die Bitte unter der Mail",
    /\n---\nÜberarbeiten Sie diesen E-Mail-Entwurf/.test(befund.verdeckt));
  ok("im Original ist jeder Fund markiert, in der KI-Fassung jeder Platzhalter",
    (await page.evaluate(() => document.querySelectorAll("#verdeckt .tok").length)) === 6);

  /* ── Kopieren ───────────────────────────────────────────────────────── */
  await page.click("#kopieren");
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  ok("Kopieren legt genau die verdeckte Fassung in die Zwischenablage", kopiert === befund.verdeckt);
  await page.fill("#antwort-ein", "Liebe ⟦NAME-1⟧, wir buchen ⟦BETRAG-1⟧ zurück.");
  ok("eine eingefügte Antwort kommt mit den echten Werten zurück",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, wir buchen 1.248,50 EUR zurück.");

  /* ── Aufgaben an die KI (Klaus 2026-09-29): antippen oder selbst eintragen ── */
  const chips = await page.evaluate(() => [...document.querySelectorAll("#aufgaben [data-aufgabe]")].map((b) => b.dataset.aufgabe));
  ok("an einem Entwurf stehen die Aufgaben zum Überarbeiten zum Antippen da", chips.length === 3 && chips.includes("✂ Kürzen"), chips.join(" · "));
  await page.click('[data-aufgabe="✂ Kürzen"]');
  const gekuerzt = await page.inputValue("#bitte");
  ok("ein Tipp auf eine Aufgabe baut die ganze Anweisung: Aufgabe, Platzhalter bleiben, nichts erfinden, nur der Text",
    /^Aufgabe: Schreibe diesen Entwurf auf das Nötige gekürzt\./.test(gekuerzt) && /Platzhalter in ⟦ ⟧ genau so/.test(gekuerzt)
    && /erfinde keine/.test(gekuerzt) && /\[bitte ergänzen/.test(gekuerzt) && /nur den fertigen Text/.test(gekuerzt), gekuerzt);
  ok("… und „Was die KI sieht“ trägt sie unter der Mail", /\n---\nAufgabe: Schreibe diesen Entwurf auf das Nötige/.test(await page.textContent("#verdeckt")));
  await page.fill("#aufgabe-eigen", "Mahnung an Erika Musterfrau über 1.248,50 EUR");
  await page.click("#aufgabe-bauen");
  ok("eine selbst eingetragene Aufgabe wird zur ganzen Anweisung",
    /^Aufgabe: Schreibe Mahnung an Erika Musterfrau über 1\.248,50 EUR\.\n/.test(await page.inputValue("#bitte")));
  await page.click("#kopieren");
  const mitAufgabe = await page.evaluate(() => navigator.clipboard.readText());
  ok("… und was darin an Namen und Beträgen steht, geht verdeckt hinaus",
    /\n---\nAufgabe: Schreibe Mahnung an ⟦NAME-\d+⟧ über ⟦BETRAG-\d+⟧\./.test(mitAufgabe) && !/Musterfrau|1\.248,50/.test(mitAufgabe), mitAufgabe.split("---")[1]);
  await page.fill("#aufgabe-eigen", "Rechnung für die Schrankmontage");
  await page.click("#aufgabe-merken");
  const gemerkt = await page.evaluate(() => ({ knopf: !!document.querySelector('[data-aufgabe="★ Rechnung für die Schrank"]'),
    ablage: localStorage.getItem("sendepruefer_aufgaben") || "" }));
  ok("„Als Knopf merken“ legt die eigene Aufgabe als Knopf an und merkt sie auf diesem Gerät",
    gemerkt.knopf && /Rechnung für die Schrankmontage/.test(gemerkt.ablage), JSON.stringify(gemerkt));
  await page.click('[data-aufgabe="★ Rechnung für die Schrank"]');
  ok("… ein Tipp darauf baut die Anweisung mit dem ganzen Text", /^Aufgabe: Schreibe Rechnung für die Schrankmontage\./.test(await page.inputValue("#bitte")));
  await page.click('[data-weg="★ Rechnung für die Schrank"]');
  ok("… und ✕ vergisst sie wieder", await page.evaluate(() => !document.querySelector('[data-aufgabe^="★"]') && (localStorage.getItem("sendepruefer_aufgaben") || "[]") === "[]"));
  await page.fill("#bitte", "Überarbeiten Sie diesen E-Mail-Entwurf: freundlich, klar und kurz.");

  /* ── Senden ohne Schlüssel: der Knopf sagt, was fehlt ────────────────── */
  await page.fill("#antwort-ein", "");
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("sendepruefer_key_")) localStorage.removeItem(k); });
  await page.selectOption("#anbieter", "anthropic");
  await page.fill("#schluessel", "");
  /* Der Weg zum Schlüssel: ein Link zur Seite des Anbieters, gemessen am
     Element, und die Adresse muss die aus der Konstante sein. */
  const holen = async () => page.evaluate(() => { const l = document.getElementById("schluessel-holen");
    return l ? { href: l.getAttribute("href"), t: l.target, rel: l.rel, sicht: l.checkVisibility() && l.getClientRects().length > 0,
      soll: window.SendePruefer.ANBIETER[document.getElementById("anbieter").value].holen } : null; });
  const h1 = await holen();
  ok("beim Schlüsselfeld steht ein sichtbarer Link zur Schlüssel-Seite des Anbieters",
    !!h1 && h1.sicht && h1.href === "https://console.anthropic.com/settings/keys" && h1.href === h1.soll, JSON.stringify(h1));
  ok("… er öffnet einen neuen Tab und gibt window.opener nicht her",
    !!h1 && h1.t === "_blank" && /noopener/.test(h1.rel) && /noreferrer/.test(h1.rel), JSON.stringify(h1));
  await page.selectOption("#anbieter", "mistral");
  const h2 = await holen();
  ok("… und er wechselt mit dem Anbieter", !!h2 && h2.href === "https://console.mistral.ai/api-keys" && h2.href === h2.soll, JSON.stringify(h2));
  await page.selectOption("#anbieter", "anthropic");
  await page.click("#senden");
  const ohne = await page.textContent("#sende-meldung");
  ok("ohne Schlüssel sagt Senden, was fehlt, und nennt den Kopieren-Weg",
    /Es fehlt ein Schlüssel für Claude/.test(ohne) && /Kopieren/.test(ohne), ohne);
  ok("… und es ging nichts hinaus", draussen.length === 0);
  await page.fill("#schluessel", "falsch-123");
  await page.click("#senden");
  ok("ein Schlüssel mit falschem Anfang wird vor dem Senden abgewiesen",
    /beginnt mit sk-ant-/.test(await page.textContent("#sende-meldung")) && draussen.length === 0);

  /* ── Senden an Anthropic ─────────────────────────────────────────────── */
  await page.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await page.click("#senden");
  await page.waitForFunction(() => /Antwort erhalten|abgelehnt|Keine Verbindung/.test(document.getElementById("sende-meldung").textContent));
  const a = draussen[0] || { headers: {}, body: "{}" };
  ok("Senden geht an genau die Adresse aus der Konstante", a.url === "https://api.anthropic.com/v1/messages", a.url);
  ok("mit den Kopfzeilen des Auftrags",
    a.headers["x-api-key"] === "sk-ant-api03-PROBEnichtECHT0000000000" && a.headers["anthropic-version"] === "2023-06-01"
    && a.headers["anthropic-dangerous-direct-browser-access"] === "true");
  const gesendet = JSON.parse(a.body).messages?.[0]?.content || "";
  ok("gesendet wurde die verdeckte Fassung", gesendet === befund.verdeckt);
  ok("im gesendeten Text steht KEIN Befund-Wert", werte.every((w) => !a.body.includes(w)));
  ok("die Antwort kommt mit den echten Werten zurück",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, die Summe 1.248,50 EUR ist erledigt.");
  ok("die Seite zeigt, was gesendet wurde", (await page.textContent("#gesendet")) === befund.verdeckt);
  /* ── Tresor (Klaus 2026-09-29): nie offen abgelegt, verschlossen mit Code ── */
  const ablage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))));
  ok("nach dem Senden liegt der Schlüssel NICHT offen im Browser-Speicher",
    !(await ablage()).includes("PROBEnichtECHT"), await ablage());
  const tMeld = () => page.textContent("#tresor-meldung");
  ok("unter dem Schlüssel steht der Tresor mit Code-Feld und Ablegen-Knopf",
    await page.evaluate(() => !!document.getElementById("tresor-code") && document.getElementById("tresor-zu").checkVisibility()));
  await page.fill("#tresor-code", "12");
  await page.click("#tresor-zu");
  await page.waitForFunction(() => /braucht mindestens|abgelegt/.test(document.getElementById("tresor-meldung").textContent), null, { timeout: 30000 }).catch(() => {});
  ok("ein zu kurzer Code wird abgewiesen und nichts abgelegt",
    /braucht mindestens 4/.test(await tMeld()) && await page.evaluate(() => localStorage.getItem("sendepruefer_tresor_anthropic")) === null, await tMeld());
  await page.evaluate(() => localStorage.setItem("sendepruefer_key_anthropic", "sk-ant-api03-PROBEnichtECHT0000000000"));   // ein alter Klartext-Eintrag
  await page.fill("#tresor-code", "4711");
  await page.click("#tresor-zu");
  await page.waitForFunction(() => /abgelegt|ging nicht/.test(document.getElementById("tresor-meldung").textContent), null, { timeout: 30000 });
  const pk = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("sendepruefer_tresor_anthropic")); } catch (_e) { return null; } });
  ok("abgelegt wird ein verschlossenes Paket (v · salt · iv · ct)",
    !!pk && pk.v === 1 && [pk.salt, pk.iv, pk.ct].every((x) => typeof x === "string" && x.length > 8), JSON.stringify(pk));
  ok("… und nirgends im Browser-Speicher steht der Schlüssel offen — der alte Klartext-Eintrag ist weg", !(await ablage()).includes("PROBEnichtECHT"));
  ok("… auch der Code steht nirgends", !(await ablage()).includes("4711"));

  /* ── Speichern: nach dem Neuladen ist die Mail samt Antwort noch da ───── */
  await page.waitForTimeout(400);   // Sorte B: das verzögerte Speichern soll WIRKLICH verstrichen sein
  await page.reload(); await bereit(page);
  const gerettet = await page.evaluate(() => window.SendePruefer.mails().find((m) => /Erika Musterfrau/.test(m.text || "")));
  ok("nach dem Neuladen liegen Mail, Antwort und Zuordnung noch auf dem Gerät",
    !!gerettet && gerettet.ordner === "entwurf" && /erledigt/.test(gerettet.antwortRoh || "") && Object.keys(gerettet.zuordnung || {}).length === 5, JSON.stringify(gerettet && { o: gerettet.ordner, z: Object.keys(gerettet.zuordnung || {}) }));
  await geheOrdner(page, "entwurf");
  await page.click(`#liste .zeile[data-id="${gerettet && gerettet.id}"]`);
  ok("die gespeicherte Antwort wird wieder mit echten Werten gezeigt",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, die Summe 1.248,50 EUR ist erledigt.");
  await page.waitForSelector("#tresor-code");
  ok("nach dem Neuladen ist das Schlüsselfeld leer und „Mit Code öffnen“ steht da",
    (await page.inputValue("#schluessel")) === "" && await page.evaluate(() => document.getElementById("tresor-auf").checkVisibility()));
  await page.fill("#tresor-code", "0000");
  await page.click("#tresor-auf");
  await page.waitForFunction(() => /passt nicht|Geöffnet/.test(document.getElementById("tresor-meldung").textContent), null, { timeout: 30000 });
  ok("ein falscher Code öffnet nichts", /passt nicht/.test(await tMeld()) && (await page.inputValue("#schluessel")) === "", await tMeld());
  await page.fill("#tresor-code", "4711");
  await page.press("#tresor-code", "Enter");
  await page.waitForFunction(() => /Geöffnet|passt nicht/.test(document.getElementById("tresor-meldung").textContent) && document.getElementById("schluessel").value, null, { timeout: 30000 }).catch(() => {});
  ok("der richtige Code (Enter genügt) setzt den Schlüssel wieder ein",
    (await page.inputValue("#schluessel")) === "sk-ant-api03-PROBEnichtECHT0000000000", await tMeld());

  /* ── Senden an Mistral: das andere Protokoll ─────────────────────────── */
  await page.selectOption("#anbieter", "mistral");
  ok("der Schlüssel des anderen Anbieters wird nicht übernommen", (await page.inputValue("#schluessel")) === "");
  await page.fill("#schluessel", "mistral-TARIF-0000");
  await page.click("#senden");
  await page.waitForFunction(() => /abgelehnt/.test(document.getElementById("sende-meldung").textContent));
  const tarif = await page.textContent("#sende-meldung");
  ok("lehnt der Tarif das Modell ab, nennt die Meldung Modell und Tarif, nicht das Guthaben",
    /mistral-small-latest ist in Ihrem Tarif nicht freigeschaltet/.test(tarif) && /nicht am Guthaben|am Guthaben liegt es nicht/.test(tarif), tarif);
  /* 429: einmal angesagt wiederholen, dann entweder durch oder erklärt (Klaus 2026-09-29) */
  await page.fill("#schluessel", "mistral-LIMIT-0000");
  await page.click("#senden");
  await page.waitForFunction(() => /Neuer Versuch/.test(document.getElementById("sende-meldung").textContent), null, { timeout: 5000 }).catch(() => {});
  const ansage = await page.textContent("#sende-meldung");
  ok("ein 429 wird angesagt, bevor der zweite Versuch läuft", /zu viele Anfragen.*Neuer Versuch in 1 s/.test(ansage), ansage);
  await page.waitForFunction(() => /Antwort erhalten|abgelehnt/.test(document.getElementById("sende-meldung").textContent), null, { timeout: 15000 }).catch(() => {});
  ok("… und der zweite Versuch bringt die Antwort", /Antwort erhalten/.test(await page.textContent("#sende-meldung")) && limitZahl === 2,
    (await page.textContent("#sende-meldung")) + " · Anfragen: " + limitZahl);
  limitZahl = 0;
  await page.fill("#schluessel", "mistral-LIMIT-IMMER-0000");
  await page.click("#senden");
  await page.waitForFunction(() => /abgelehnt/.test(document.getElementById("sende-meldung").textContent), null, { timeout: 15000 }).catch(() => {});
  const zuviel = await page.textContent("#sende-meldung");
  ok("bleibt es bei 429, erklärt die Meldung die Grenze und den Weg", /\(429\)/.test(zuviel) && /zweite Versuch kam zu früh/.test(zuviel) && /Minute warten/.test(zuviel), zuviel);
  ok("… und es wird genau einmal wiederholt, nicht öfter", limitZahl === 2, "Anfragen: " + limitZahl);
  draussen.splice(1);
  await page.fill("#schluessel", "mistral-PROBE-0000");
  await page.click("#senden");
  await page.waitForFunction(() => /Antwort erhalten/.test(document.getElementById("sende-meldung").textContent) && document.getElementById("antwort-klar").textContent.includes("antworten"));
  const m = draussen[1] || { headers: {}, body: "{}" };
  ok("Mistral bekommt seine Adresse und eine Bearer-Kopfzeile",
    m.url === "https://api.mistral.ai/v1/chat/completions" && m.headers.authorization === "Bearer mistral-PROBE-0000");
  ok("… im OpenAI-Protokoll, mit der verdeckten Fassung",
    JSON.parse(m.body).messages?.[0]?.content === befund.verdeckt && JSON.parse(m.body).model === "mistral-small-latest");
  ok("… mit einer Ausgabe-Grenze (max_tokens 4096) — ohne sie rechnet Mistral die volle Länge gegen die Tokens pro Minute",
    JSON.parse(m.body).max_tokens === 4096, m.body.slice(0, 120));
  ok("die Mistral-Antwort wird gelesen und aufgedeckt",
    (await page.textContent("#antwort-klar")) === "Bitte an erika@beispiel.test antworten.");

  /* ── Schlüssel löschen, Zuordnung verwerfen ──────────────────────────── */
  await page.click("#schluessel-weg");
  ok("Schlüssel löschen entfernt ihn", await page.evaluate(() => localStorage.getItem("sendepruefer_key_mistral")) === null);
  await page.selectOption("#anbieter", "anthropic");
  ok("zurück beim ersten Anbieter steht der geöffnete Schlüssel wieder im Feld",
    (await page.inputValue("#schluessel")) === "sk-ant-api03-PROBEnichtECHT0000000000");
  await page.click("#schluessel-weg");
  ok("Schlüssel löschen nimmt auch den Tresor dieses Anbieters weg",
    await page.evaluate(() => localStorage.getItem("sendepruefer_tresor_anthropic")) === null && (await page.inputValue("#schluessel")) === "");
  await page.click("#verwerfen");
  ok("nach dem Verwerfen setzt die Seite keine Werte mehr ein",
    (await page.textContent("#antwort-klar")) === "Bitte an ⟦MAIL-1⟧ antworten.");
  ok("es ging insgesamt genau zweimal etwas hinaus", draussen.length === 2, draussen.length);

  /* ── Weitere Anbieter (Klaus 2026-09-29): ChatGPT und Gemini ─────────── */
  draussen.splice(0);
  await page.selectOption("#anbieter", "openai");
  await page.fill("#schluessel", "sk-PROBEnichtECHT0000");
  await page.click("#senden");
  await page.waitForFunction(() => /Antwort erhalten|abgelehnt|Keine Verbindung/.test(document.getElementById("sende-meldung").textContent));
  const oa = draussen[0] || { headers: {}, body: "{}" };
  const oaB = (() => { try { return JSON.parse(oa.body); } catch (_e) { return {}; } })();
  ok("ChatGPT bekommt seine Adresse, eine Bearer-Kopfzeile und das Modell aus der Liste",
    oa.url === "https://api.openai.com/v1/chat/completions" && oa.headers.authorization === "Bearer sk-PROBEnichtECHT0000" && oaB.model === "gpt-5-mini", oa.url);
  ok("… mit max_completion_tokens statt max_tokens", oaB.max_completion_tokens === 4096 && !("max_tokens" in oaB), oa.body.slice(0, 120));
  ok("… und die Antwort wird aufgedeckt", /Antwort erhalten/.test(await page.textContent("#sende-meldung")));
  await page.selectOption("#anbieter", "gemini");
  ok("der Schlüssel-Link wechselt auf Google AI Studio",
    (await page.getAttribute("#schluessel-holen", "href")) === "https://aistudio.google.com/apikey");
  await page.fill("#schluessel", "sk-falsch");
  await page.click("#senden");
  ok("ein Gemini-Schlüssel muss mit AIza beginnen", /beginnt mit AIza/.test(await page.textContent("#sende-meldung")));
  await page.fill("#schluessel", "AIzaFEHL0000");
  await page.click("#senden");
  await page.waitForFunction(() => /abgelehnt|Antwort erhalten|Keine Verbindung/.test(document.getElementById("sende-meldung").textContent));
  const gm = await page.textContent("#sende-meldung");
  ok("eine Gemini-Ablehnung (als Liste) wird mit ihrem Grund gezeigt", /\(400\): API key not valid/.test(gm), gm);
  ok("Gemini geht an seine eigene Adresse",
    (draussen[1] || {}).url === "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  await page.fill("#schluessel", ""); await page.selectOption("#anbieter", "anthropic");

  /* ── Beispiel-E-Mail (Klaus 2026-09-28): ein Tipp zeigt den ganzen Weg ── */
  await page.click("#menue");
  await page.click("#beispiel");
  await page.waitForFunction(() => /Rechnung RE-2026/.test((document.querySelector("h1.betreff") || {}).textContent || ""));
  const bspOrig = await page.evaluate(() => document.querySelector("main.lesen .blatt").textContent);
  ok("das Beispiel ist eine E-Mail mit Kopfzeilen", /^Von: .*\nAn: .*\nBetreff: /.test(bspOrig), bspOrig.slice(0, 80));
  await page.click('[data-sicht="ki"]');
  const bsp = await page.evaluate(() => ({
    ver: document.getElementById("verdeckt").textContent,
    klar: (document.getElementById("antwort-klar") || {}).textContent || "",
    hin: !!document.querySelector("[data-beispiel-meldung]") && document.querySelector("[data-beispiel-meldung]").checkVisibility(),
  }));
  const bspWerte = ["Petra Beispiel", "Musterbau GmbH", "petra.beispiel@musterbau.example", "buchhaltung@beispiel-firma.example",
    "RE-2026-04871", "1.248,50", "DE89 3704", "+49 170"];
  const bspDrin = bspWerte.filter((w) => bsp.ver.includes(w));
  ok("in der verdeckten Fassung steht kein Wert des Beispiels", bsp.ver.length > 50 && bspDrin.length === 0, bspDrin.join(" · "));
  ok("keine führende 1. vor dem Betrags-Platzhalter", /über ⟦BETRAG-1⟧/.test(bsp.ver));
  ok("die Beispiel-Antwort kommt mit den echten Angaben zurück",
    /Frau Beispiel,/.test(bsp.klar) && bsp.klar.includes("RE-2026-04871") && bsp.klar.includes("1.248,50 EUR") && !/⟦/.test(bsp.klar), bsp.klar.slice(0, 120));
  ok("am Beispiel sagt die Seite, dass alles erfunden ist", bsp.hin);
  /* Klaus 2026-09-29: „Musterbau GmbHBeispiel“ — ein Zeilenumbruch aus einer
     älteren Fassung verschwand im einzeiligen Feld. Gestellt wie auf seinem Gerät. */
  const namenFeld = await page.evaluate(() => { const m = window.SendePruefer.mails().find((x) => x.bid === "petra" && x.ordner === "eingang");
    m.namenExtra = "Musterbau GmbH\nBeispiel"; document.querySelector('.zeile[data-id="' + m.id + '"]').click();
    return document.getElementById("namen").value; });
  ok("Weitere Namen aus mehreren Zeilen stehen mit Komma getrennt im Feld", namenFeld === "Musterbau GmbH, Beispiel", namenFeld);
  ok("das Beispiel liegt nur einmal im Postfach (kein Doppel)",
    await page.evaluate(() => window.SendePruefer.mails().filter((m) => m.bid === "petra" && m.ordner === "eingang").length === 1));

  /* ── Antwort ablegen und als .eml speichern ──────────────────────────── */
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#antwort-eml")]);
  const eml = readFileSync(await dl.path(), "utf8");
  ok("die .eml ist an den Absender adressiert, mit Betreff „Re:“",
    /^To: "Petra Beispiel" <petra\.beispiel@musterbau\.example>\r\n/m.test(eml) && /^Subject: Re: Rechnung RE-2026-04871 noch offen\r\n/m.test(eml), eml.slice(0, 160));
  ok("… trägt UTF-8, X-Unsent und die Antwort MIT echten Angaben, ohne Platzhalter",
    /Content-Type: text\/plain; charset=utf-8/.test(eml) && /X-Unsent: 1/.test(eml) && eml.includes("1.248,50 EUR") && !/⟦/.test(eml));
  const nachEml = await page.evaluate(() => window.SendePruefer.mails().filter((m) => m.bezug && /^Re: Rechnung/.test(m.betreff)).map((m) => m.ordner));
  ok("die gespeicherte Antwort liegt danach genau einmal in „Exportiert“", JSON.stringify(nachEml) === '["export"]', nachEml.join(","));

  /* ── Teilen: dieselbe .eml geht an das Teilen-Fenster ────────────────── */
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    /* wie Chrome: Dateien beim Teilen abweisen (Klaus 2026-09-29, NotAllowedError bei .eml) */
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { if (d.files) throw new DOMException("x", "NotAllowedError"); window.__geteilt = d; } });
  });
  await page.click("#antwort-teilen");
  await page.waitForFunction(() => window.__geteilt, null, { timeout: 4000 }).catch(() => {});
  const geteilt = (await page.evaluate(() => window.__geteilt)) || {};
  ok("Teilen gibt Betreff und Text weiter, keine Datei (Chrome lehnt .eml ab)",
    /^Re: Rechnung/.test(geteilt.title || "") && String(geteilt.text || "").includes("1.248,50 EUR") && !/⟦/.test(geteilt.text || ""), JSON.stringify(geteilt).slice(0, 160));

  /* ── .eml hin und zurück, Umlaute im Kopf ────────────────────────────── */
  const rund = await page.evaluate(() => {
    const m = { anName: "Jörg Übel", anAdr: "j@x.example", betreff: "Grüße aus Köln — und ein sehr langer Betreff, der umbrechen muss, weil er so lang ist", text: "Zeile 1\nÄrger über 12,00 €" };
    const e = window.SendePruefer.emlBauen(m), z = window.SendePruefer.mailLesen(e);
    return { ok: z.anName === m.anName && z.betreff === m.betreff && z.text === m.text, e, z };
  });
  ok("eine .eml mit Umlauten im Betreff geht hin und zurück ohne Verlust", rund.ok, JSON.stringify(rund.z));
  ok("… und ihr Kopf ist reines ASCII (RFC 2047)", /^[\x00-\x7f]*$/.test(rund.e.split("\r\n\r\n")[0]));

  /* ── Mail einfügen: roh aus einem Mail-Programm ──────────────────────── */
  const vonKodiert = "=?UTF-8?B?" + Buffer.from("Jörg Beispiel").toString("base64") + "?=";
  const rohEml = [`From: ${vonKodiert} <joerg@probe.example>`, "To: info@firma.example", "Subject: =?UTF-8?Q?Gr=C3=BC=C3=9Fe_aus_K=C3=B6ln?=",
    "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="GRENZE"', "", "--GRENZE",
    "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: quoted-printable", "",
    "Sch=C3=B6ne Gr=C3=BC=C3=9Fe, Rechnung RE-2026-00077 =C3=BCber 99,00 EUR.", "--GRENZE",
    "Content-Type: text/html; charset=utf-8", "", "<p>HTML</p>", "--GRENZE--", ""].join("\r\n");
  await page.click("#einfuegen");
  await page.fill("#einfuegen-text", rohEml);
  await page.click("#einfuegen-ok");
  await page.waitForFunction(() => !document.getElementById("einfuegen-dialog").open);
  const ein = await page.evaluate(() => window.SendePruefer.mails().find((m) => m.vonAdr === "joerg@probe.example"));
  ok("eingefügte Mail: Absender, Betreff und Text sind entschlüsselt",
    !!ein && ein.vonName === "Jörg Beispiel" && ein.betreff === "Grüße aus Köln" && ein.text === "Schöne Grüße, Rechnung RE-2026-00077 über 99,00 EUR.", JSON.stringify(ein));
  ok("… liegt in „Eingefügt“, und der Absendername wird ohne Zutun verdeckt",
    !!ein && ein.ordner === "eingang" && (await page.textContent("#anzahl")) === "5" && !(await sichtbar(page, "[data-ohne-namen]")), await page.textContent("#anzahl"));
  const deutsch = await page.evaluate(() => window.SendePruefer.mailLesen("Von: Anna Probe <anna@probe.example>\nBetreff: Hallo\n\nText hier"));
  ok("eingefügter Text mit deutschen Kopfzeilen wird ebenso gelesen",
    deutsch.vonName === "Anna Probe" && deutsch.vonAdr === "anna@probe.example" && deutsch.betreff === "Hallo" && deutsch.text === "Text hier");
  await page.click("#einfuegen");
  await page.setInputFiles("#einfuegen-datei", { name: "brief.eml", mimeType: "message/rfc822", buffer: Buffer.from(rohEml.replace("joerg@", "datei@")) });
  await page.waitForFunction(() => window.SendePruefer.mails().some((m) => m.vonAdr === "datei@probe.example"));
  ok("eine .eml-Datei lässt sich ebenso öffnen", true);

  /* ── Suche ───────────────────────────────────────────────────────────── */
  await geheOrdner(page, "eingang");
  await page.fill("#suche", "Holzwurm");
  const gesucht = await page.evaluate(() => [...document.querySelectorAll("#liste .zeile .wer")].map((e) => e.textContent));
  ok("die Suche findet nur die passende Mail", JSON.stringify(gesucht) === '["Jonas Beispielmann"]', gesucht.join(","));
  await page.fill("#suche", "");

  /* ── Hell und dunkel ─────────────────────────────────────────────────── */
  const grund = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const vorher = await grund();
  const knopfText = () => page.evaluate(() => ({ t: document.getElementById("thema").textContent.trim(), jetzt: document.getElementById("thema").dataset.jetzt }));
  const k1 = await knopfText();
  await page.click("#thema");
  const nachher = await grund();
  const k2 = await knopfText();
  ok("der Umschalter wechselt hell und dunkel", vorher !== nachher, vorher + " → " + nachher);
  ok("der Knopf sagt in Worten, wohin er schaltet (Hell ⟷ Dunkel)",
    k1.jetzt !== k2.jetzt && [k1, k2].every((k) => (k.jetzt === "dunkel" ? /Hell/ : /Dunkel/).test(k.t)), JSON.stringify([k1, k2]));
  /* Klaus 2026-09-28: Knöpfe „ähnlich wie Tomys Hub“ — Glas mit Tiefe. Gemessen am
     berechneten Stil, in BEIDEN Themen: Verlauf im Haupt-Knopf, innere Schatten. */
  for (const thema of ["light", "dark"]) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, thema);
    const st = await page.evaluate(() => { const c = getComputedStyle(document.getElementById("fab").offsetParent ? document.getElementById("fab") : document.getElementById("neu"));
      const f = getComputedStyle(document.getElementById("thema")); return { bg: c.backgroundImage, sh: c.boxShadow, farbe: c.color, fsh: f.boxShadow }; });
    ok(`Knöpfe im Glas-Stil (${thema}): Verlauf, innere Schatten, weiße Schrift`,
      /gradient/.test(st.bg) && /inset/.test(st.sh) && st.farbe === "rgb(255, 255, 255)" && /inset/.test(st.fsh), JSON.stringify(st));
  }
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, await page.evaluate(() => localStorage.getItem("sendepruefer_thema")));
  await page.reload(); await bereit(page);
  ok("… und die Wahl übersteht das Neuladen", (await grund()) === nachher);

  /* ── Selbsttest über das Menü ────────────────────────────────────────── */
  await page.click("#menue");
  await page.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await page.click("#test-start");
  await page.waitForFunction(() => window.__selbsttest);
  const st = await page.evaluate(() => window.__selbsttest);
  ok(`der Selbsttest besteht (${st.gut} von ${st.gesamt})`, st.gut === st.gesamt && st.gesamt >= 20,
    st.erg.filter((e) => !e.ok).map((e) => e.satz).join(" | "));
  const summe = await page.textContent("#test-summe");
  console.log("  PROBE: " + summe);
  console.log("  PROBE-ZEILEN:\n" + st.erg.map((e) => "    " + (e.ok ? "✓ " : "✗ ") + e.satz).join("\n"));
  await page.click("#menue-zu");
  ok("mit Modul 25 steht der Hinweis NICHT da", !(await sichtbar(page, "[data-modul-fehlt]")));

  /* ── Handy: eine Spalte, Liste ODER Mail, kein Querlauf ──────────────── */
  await page.setViewportSize({ width: 360, height: 800 });
  await page.click('#bottomnav [data-ordner="eingang"]');
  ok("am Handy steht die Liste allein, mit Ordnerleiste unten",
    (await sichtbar(page, "section.liste")) && !(await sichtbar(page, "main.lesen")) && (await sichtbar(page, "#bottomnav")));
  await page.click("#liste .zeile");
  ok("ein Tipp auf eine Mail zeigt sie allein, mit „Zurück“",
    !(await sichtbar(page, "section.liste")) && (await sichtbar(page, "main.lesen")) && (await sichtbar(page, ".knopf.zurueck")));
  await page.click("#ki-oeffnen");
  const einChips = await page.evaluate(() => ({ ki: document.getElementById("ki-oeffnen").textContent,
    chips: [...document.querySelectorAll("#aufgaben [data-aufgabe]")].map((b) => b.dataset.aufgabe) }));
  ok("an einer eingefügten Mail stehen Antwort, Rechnung, Mahnung und Angebot zum Antippen da",
    /beantworten/.test(einChips.ki) && ["💬 Antwort", "🧾 Rechnung", "⏰ Mahnung", "📋 Angebot"].every((c) => einChips.chips.includes(c)), JSON.stringify(einChips));
  ok("bei 360 px läuft nichts quer", await page.evaluate(() => document.documentElement.scrollWidth <= 360));
  await page.click(".knopf.zurueck");
  ok("„Zurück“ bringt die Liste wieder", await sichtbar(page, "section.liste"));

  /* ── als Datei geöffnet: läuft, und der Selbsttest sagt, was zu tun ist ── */
  const datei = await ctx.newPage();
  const fehler = [];
  datei.on("pageerror", (e) => fehler.push(String(e)));
  await datei.goto(pathToFileURL(join(WURZEL, "sende-pruefer.html")).href);
  await bereit(datei);
  await verfassen(datei);
  await datei.fill("#text", "a@b.de");
  ok("direkt als Datei geöffnet funktioniert die Prüfung", (await datei.textContent("#anzahl")) === "1" && fehler.length === 0, fehler.join(" "));
  await datei.click("#menue");
  await datei.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await datei.click("#test-start");
  await datei.waitForFunction(() => document.getElementById("test-summe").textContent.length > 0);
  ok("… und der Selbsttest nennt den Weg über die Dateiwahl", /koeder\.txt/.test(await datei.textContent("#test-summe")));
  await datei.setInputFiles("#test-datei", join(WURZEL, "koeder.txt"));
  await datei.waitForFunction(() => window.__selbsttest);
  const st2 = await datei.evaluate(() => window.__selbsttest);
  ok("über die Dateiwahl besteht er ebenso", st2.gut === st2.gesamt);

  /* Eine eigene Mail aufschreiben und bis „Mit KI“ öffnen. */
  async function entwurf(p, t) { await verfassen(p); await p.fill("#text", t); await p.click("#ki-oeffnen"); }

  /* ── ohne Modul 25: die Seite sagt es und lässt nichts hinaus ─────────── */
  /* ⚠ EIGENER KONTEXT. Im Kontext der normalen Seite ist das Modul schon im
     Speicher, und die 404 käme nie an. Die Zeile „wirklich angefragt"
     darunter besteht darauf, dass gemessen wurde. */
  const ohneCtx = await browser.newContext({ serviceWorkers: "block" });
  const ohneModul = await ohneCtx.newPage();
  ohneModul.__geholt = [];
  ohneModul.on("request", (q) => ohneModul.__geholt.push(q.url()));
  await ohneModul.route("**/modules/25_pseudonym.js", (r) => r.fulfill({ status: 404, body: "" }));
  await ohneModul.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ohneModul.goto(BASIS + "sende-pruefer.html");
  await bereit(ohneModul);
  ok("fehlt Modul 25, steht der Hinweis sichtbar da", await sichtbar(ohneModul, "[data-modul-fehlt]"));
  await entwurf(ohneModul, "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
  await ohneModul.click("#kopieren");
  ok("… und Kopieren wird verweigert, mit Grund",
    /Prüfkern fehlt/.test(await ohneModul.textContent("#kopier-meldung")));
  await ohneModul.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await ohneModul.click("#senden");
  ok("… und Senden wird verweigert, mit Grund",
    /Prüfkern fehlt/.test(await ohneModul.textContent("#sende-meldung")));
  ok("… und das Modul wurde wirklich angefragt und abgewiesen (sonst misst dieser Abschnitt nichts)",
    ohneModul.__geholt.some((u) => u.endsWith("/modules/25_pseudonym.js")));
  await ohneCtx.close();
  /* ── die letzte Sicherung: versagt das Verdecken, geht nichts hinaus ─────
     Gestellt wird ein Prüfkern, der die Werte FINDET, aber nicht ersetzt.
     Nur in dieser Lage greift die Sicherung; ohne sie war sie von ihrem
     Fehlen nicht zu unterscheiden (Gegenprobe 2026-09-28: blind). */
  const kaputtCtx = await browser.newContext({ serviceWorkers: "block" });
  const kaputt = await kaputtCtx.newPage();
  const quelle = modulBytes ? modulBytes.toString("utf8") : "";
  const kaputtQuelle = quelle.replace("return { text: out + text.slice(pos), map:", "return { text: text, map:");
  ok("der gestellte kaputte Prüfkern unterscheidet sich wirklich", !!quelle && kaputtQuelle !== quelle);
  await kaputt.route("**/modules/25_pseudonym.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: kaputtQuelle }));
  const kaputtRaus = [];
  await kaputt.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { kaputtRaus.push(r.request().url()); return r.abort(); });
  await kaputt.goto(BASIS + "sende-pruefer.html");
  await bereit(kaputt);
  await entwurf(kaputt, "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
  await kaputt.click("#kopieren");
  ok("versagt das Verdecken, wird NICHT kopiert", /gefundenen Wert/.test(await kaputt.textContent("#kopier-meldung")));
  await kaputt.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await kaputt.click("#senden");
  ok("versagt das Verdecken, wird NICHT gesendet", /gefundenen Wert/.test(await kaputt.textContent("#sende-meldung")) && kaputtRaus.length === 0);
  await kaputtCtx.close();

  /* ── Abschirmung: Fremdes erkennen, mit einem Klick abschirmen (2026-09-29) ─ */
  const abCtx = await browser.newContext({ serviceWorkers: "block" });
  const ab = await abCtx.newPage();
  await ab.goto(BASIS + "sende-pruefer.html");
  const abRaus = [];
  ab.on("request", (r) => { if (!r.url().startsWith(BASIS.slice(0, -1))) abRaus.push(r.url()); });
  await bereit(ab);
  await ab.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 30000 }).catch(() => {});
  await ab.waitForTimeout(600);
  const kn = await ab.evaluate(() => ({
    fehlt: ["SbkimStorage", "SbkimSpore", "SbkimEmbedding", "SbkimMatch", "SbkimAnastomose", "SbkimNostrRelay", "SbkimApoptose", "SbkimMembrane", "SbkimSiegel", "SbkimRendezvous", "SbkimRendezvousUI"].filter((k) => !window[k]),
    widget: !!document.getElementById("sbkim-widget"),
    lebt: document.getElementById("lamp-alive").classList.contains("on") }));
  ok("alle 11 Module des Knotens sind geladen (die Kette ist durchgelaufen)", kn.fehlt.length === 0, kn.fehlt.join(" "));
  ok("… kein fliegendes Widget in der Seite", kn.widget === false);
  ok("… und die Lampe „lebt“ leuchtet (eigene Identität geladen)", kn.lebt);
  ok("beim Laden geht keine einzige Anfrage nach draußen (auch nicht vom Knoten)", abRaus.length === 0, abRaus.slice(0, 3).join(" "));
  ok("ohne Fremdes: kein Fund, kein Banner", await ab.evaluate(() => SendeAbschirmung.funde().length === 0 && document.getElementById("fremd-banner").hidden));
  ok("… und die FREMD-Lampe ist aus", await ab.evaluate(() => !document.getElementById("lamp-fremd").classList.contains("bad")));
  await ab.evaluate(() => document.body.append(document.createElement("grammarly-desktop-integration")));
  await ab.waitForFunction(() => SendeAbschirmung.funde().length > 0).catch(() => {});
  ok("ein fremdes Element wird erkannt und beim Namen genannt",
    /grammarly-desktop-integration/.test(await ab.textContent("#fremd-banner-text")) && !(await ab.evaluate(() => document.getElementById("fremd-banner").hidden)));
  ok("… die FREMD-Lampe in der Kopfleiste leuchtet rot", await ab.evaluate(() => document.getElementById("lamp-fremd").classList.contains("bad")
    && document.querySelector('[data-lampe-kopie="lamp-fremd"]').classList.contains("bad")));
  ok("… und der Schild-Knopf zeigt die Zahl", (await ab.textContent("#schild-zahl")).trim() === "1");
  /* Das Siegel legt sicherheit.html als iframe hinein — das ist die eigene Seite (Klaus 2026-09-29). */
  const vorEigen = await ab.evaluate(() => SendeAbschirmung.funde().length);
  await ab.evaluate(() => { const f = document.createElement("iframe"); f.src = "sicherheit.html"; f.style.display = "none"; document.body.append(f); });
  await ab.evaluate(() => { const f = document.createElement("iframe"); f.src = "/Fremd/sicherheit.html"; f.style.display = "none"; document.body.append(f); });
  await ab.waitForFunction((n) => SendeAbschirmung.funde().length > n, vorEigen).catch(() => {});
  const eigenFunde = await ab.evaluate(() => SendeAbschirmung.funde().map((f) => f.was));
  ok("das Siegel-Fenster mit der eigenen sicherheit.html gilt NICHT als fremd",
    !eigenFunde.some((w) => /iframe/.test(w) && /sicherheit\.html/.test(w) && !/Fremd/.test(w)), eigenFunde.join(" | "));
  ok("… ein sicherheit.html aus einem anderen Ordner schon", eigenFunde.some((w) => /Fremd\/sicherheit\.html/.test(w)), eigenFunde.join(" | "));
  const sicherStatus = await ab.evaluate(() => fetch("sicherheit.html").then((r) => r.status));
  ok("sicherheit.html wird ausgeliefert (der Link Ausführlich erklärt im Siegel)", sicherStatus === 200, sicherStatus);
  await ab.evaluate(() => { const f = document.createElement("iframe"); f.style.display = "none"; document.body.append(f); });
  await ab.waitForFunction(() => SendeAbschirmung.funde().length > 1).catch(() => {});
  ok("ein eingelegtes iframe wird erkannt", await ab.evaluate(() => SendeAbschirmung.funde().some((f) => /iframe/.test(f.was))));
  await ab.evaluate(() => document.body.setAttribute("data-lt-tmp-id", "x"));
  await ab.waitForFunction(() => SendeAbschirmung.funde().length > 2).catch(() => {});
  ok("eine Marke an einem VORHANDENEN Element wird erkannt (LanguageTool)", await ab.evaluate(() => SendeAbschirmung.funde().some((f) => /LanguageTool/.test(f.was))));
  await ab.click("#schild");
  const zu = await ab.evaluate(() => { const t = document.getElementById("einfuegen-text");
    return { an: document.getElementById("schild").dataset.an, ws: t.getAttribute("writingsuggestions"), g: t.getAttribute("data-gramm"),
      ac: t.getAttribute("autocorrect"), banner: document.getElementById("fremd-banner").hidden, n: SendeAbschirmung.funde().length }; });
  ok("ein Klick schirmt ab: KI-Schreibhilfe, Grammarly-Marke, Autokorrektur aus",
    zu.an === "1" && zu.ws === "false" && zu.g === "false" && zu.ac === "off", JSON.stringify(zu));
  /* 4 Funde: Grammarly-Element · fremdes sicherheit.html · leeres iframe · LanguageTool */
  ok("… das Banner geht weg, der Befund bleibt gezählt", zu.banner === true && zu.n === 4);
  ok("… die eigenen Marken melden sich nicht selbst als Fund", zu.n === 4);
  await verfassen(ab);
  ok("ein Feld, das DANACH entsteht, ist auch abgeschirmt", await ab.evaluate(() => document.getElementById("text").getAttribute("writingsuggestions") === "false"));
  await ab.reload(); await bereit(ab);
  ok("die Wahl übersteht das Neuladen", await ab.evaluate(() => SendeAbschirmung.an() && document.getElementById("einfuegen-text").getAttribute("writingsuggestions") === "false"));
  await ab.click("#schild");
  const auf = await ab.evaluate(() => { const t = document.getElementById("einfuegen-text");
    return { ws: t.getAttribute("writingsuggestions"), sp: t.getAttribute("spellcheck"), g: t.hasAttribute("data-gramm") }; });
  ok("der zweite Klick stellt die alten Werte wieder her (auch das spellcheck, das schon vorher aus war)",
    auf.ws === null && auf.sp === "false" && auf.g === false, JSON.stringify(auf));
  ok("die Grenzen stehen im Menü (Erweiterungen dürfen es übergehen, Programme auf dem Gerät sieht keine Webseite)",
    /übergehen/.test(html.split("data-abschirm-grenze")[1] || "") && /Gerät/.test(html.split("data-abschirm-grenze")[1] || ""));
  await abCtx.close();
  /* Ein Fund VOR dem Start des Knotens muss die Lampe trotzdem zünden. */
  const frCtx = await browser.newContext({ serviceWorkers: "block" });
  const fr = await frCtx.newPage();
  await fr.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.documentElement.setAttribute("data-gr-ext-installed", "")));
  await fr.goto(BASIS + "sende-pruefer.html");
  await bereit(fr);
  await fr.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 30000 }).catch(() => {});
  ok("ein Fund schon beim Laden zündet die FREMD-Lampe, auch wenn der Knoten erst danach startet",
    await fr.evaluate(() => SendeAbschirmung.funde().length === 1 && document.getElementById("lamp-fremd").classList.contains("bad")));
  await frCtx.close();

} catch (e) {
  rot++; console.log("✗ ROT: unterwegs gestolpert → " + (e && e.stack || e));
}
/* Ein Stolpern vorn darf die Prüfungen dahinter nicht mitnehmen: Handbuch und
   Netz-Leiste laufen in einem eigenen Block (Gegenprobe 2026-09-29 — ein
   aufgeklapptes Menü verdeckte die Seite, und die Leisten-Wächter liefen nie). */
try {
  const bereit = (p) => p.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  /* ── das große Bild im leeren Raum, und sein Flug in die Kopfleiste ── */
  for (const ruhig of [false, true]) {
    const bCtx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 800 }, reducedMotion: ruhig ? "reduce" : "no-preference" });
    const b = await bCtx.newPage(); await b.goto(BASIS + "sende-pruefer.html"); await bereit(b);
    const leer = await b.evaluate(async () => { const i = document.querySelector(".bild-buehne[data-licht] .leer-bild"); if (!i) return null;
      try { await i.decode(); } catch (_e) {} return { sicht: i.checkVisibility(), w: i.naturalWidth, marke: document.querySelector(".marke-bild").checkVisibility() }; });
    if (!ruhig) {
      ok("ohne gewählte Mail steht das große Bild im Lesebereich, mit Lichtkegel", !!leer && leer.sicht && leer.w > 0, JSON.stringify(leer));
      ok("… und oben steht es klein als Marke neben dem Namen", !!leer && leer.marke);
    }
    await b.click("#liste .zeile");
    const flug = await b.waitForSelector("[data-flug]", { timeout: 1500 }).then(() => true, () => false);
    if (!ruhig) {
      ok("öffnet man eine Mail, fliegt das Bild in die Kopfleiste", flug);
      ok("… und ist danach wieder weg (kein Rest über der Seite)", await b.waitForSelector("[data-flug]", { state: "detached", timeout: 3000 }).then(() => true, () => false));
    } else ok("bei „weniger Bewegung“ fliegt nichts", !flug);
    await bCtx.close();
  }

  /* ── kein weißer Saum am Rand der Bilder (Klaus 2026-09-29: „weiße Blitzer
     an den runden Ecken, überall, wo das Icon ist"). Gezählt werden fast weiße,
     sichtbare Pixel in einem Band neben der durchsichtigen Fläche. Gemessen im
     Browser über ein Canvas, weil Node keine Bilder lesen kann. ── */
  {
    const sCtx = await browser.newContext({ serviceWorkers: "block" });
    const s = await sCtx.newPage(); await s.goto(BASIS + "sende-pruefer.html");
    for (const f of ["icons/sende-pruefer-bild-gross.webp", "icons/sende-pruefer-bild.webp", "icons/marke-72.png",
                     "icons/icon-512.png", "icons/icon-192.png", "icons/favicon-48.png", "icons/favicon-32.png"]) {
      /* apple-touch-icon und maskable sind randlos gefüllt — dort gibt es keinen Rand zum Grund. */
      const r = await s.evaluate(async (src) => {
        const i = new Image(); i.src = src; try { await i.decode(); } catch (_e) { return null; }
        const w = i.naturalWidth, h = i.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, w, h).data;
        const k = Math.max(2, Math.floor(w / 80)), T = new Int32Array((w + 1) * (h + 1));
        for (let y = 0; y < h; y++) for (let q = 0; q < w; q++)
          T[(y + 1) * (w + 1) + q + 1] = (d[(y * w + q) * 4 + 3] < 10 ? 1 : 0) + T[y * (w + 1) + q + 1] + T[(y + 1) * (w + 1) + q] - T[y * (w + 1) + q];
        /* Außerhalb des Bildes zählt als durchsichtig — dort sieht man den Grund. */
        const summe = (x0, y0, x1, y1) => (x0 < 0 || y0 < 0 || x1 > w || y1 > h) ? 1 :
          T[y1 * (w + 1) + x1] - T[y0 * (w + 1) + x1] - T[y1 * (w + 1) + x0] + T[y0 * (w + 1) + x0];
        let saum = 0, rand = 0;
        for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
          const o = (y * w + q) * 4, a = d[o + 3]; if (a < 30) continue;
          if (!summe(q - k, y - k, q + k + 1, y + k + 1)) continue;
          rand++;
          const mn = Math.min(d[o], d[o + 1], d[o + 2]), mx = Math.max(d[o], d[o + 1], d[o + 2]);
          if (mn > 150 && mx - mn < 60) saum++;
        }
        return { w, saum, rand };
      }, BASIS + f);
      ok("kein weißer Saum am Rand: " + f, !!r && r.rand > 0 && r.saum <= Math.ceil(r.rand * 0.002), JSON.stringify(r));
    }
    await sCtx.close();
  }

  /* ── das Handbuch im echten Browser ─────────────────────────────────── */
  for (const [breite, mitJs] of [[1280, true], [380, true], [380, false]]) {
    const hCtx = await browser.newContext({ serviceWorkers: "block", viewport: { width: breite, height: 800 }, javaScriptEnabled: mitJs });
    const h = await hCtx.newPage();
    const hDraussen = []; await h.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { hDraussen.push(r.request().url()); r.abort(); });
    if (mitJs) await h.addInitScript(() => {
      window.__gesprochen = [];
      const stimmen = [{ name: "Netz-Stimme", lang: "de-DE", localService: false }];
      /* speechSynthesis ist ein Getter ohne Setter — eine Zuweisung liefe still ins Leere,
         und die Probe mäße die echte (leere) Stimmenliste des Browsers. */
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => stimmen, speak: (u) => { window.__gesprochen.push(u.voice && u.voice.name); setTimeout(() => u.onend && u.onend(), 30); }, cancel: () => {} } });
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.__stimmen = stimmen;
    });
    await h.goto(BASIS + "handbuch.html", { waitUntil: "load" });
    const was = mitJs ? " (mit Skript)" : " (OHNE Skript)";
    const hb2 = await h.evaluate(async () => { const imgs = [...document.querySelectorAll(".szene img")];
      for (const i of imgs) { i.loading = "eager"; i.scrollIntoView(); try { await i.decode(); } catch (_e) {} }
      window.scrollTo(0, 0);
      return { n: imgs.length, geladen: imgs.filter((i) => i.naturalWidth > 0).length, ueber: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    ok(breite + " px" + was + ": jedes Bild des Handbuchs lädt", hb2.n >= 8 && hb2.geladen === hb2.n, JSON.stringify(hb2));
    ok(breite + " px" + was + ": … nichts läuft quer über den Rand", hb2.ueber <= 0, hb2.ueber);
    ok(breite + " px" + was + ": … kein Aufruf nach draußen", hDraussen.length === 0, hDraussen.join(", "));
    if (!mitJs) {
      const blass = await h.evaluate(() => [...document.querySelectorAll(".szene")].filter((x) => getComputedStyle(x).opacity !== "1").length);
      ok("ohne Skript steht jede Szene voll da (nichts wartet auf ein Einblenden)", blass === 0, blass);
    } else if (breite === 1280) {
      await h.click("#vorfuehren");
      await h.waitForFunction(() => /Keine Stimme|Vorgelesen/.test(document.getElementById("stimme").textContent));
      ok("▶ Vorführen zeigt die Untertitel-Leiste mit dem Sprechtext der ersten Szene",
        await h.evaluate(() => !document.getElementById("buehne").hidden && document.getElementById("ut").textContent.length > 30 && document.querySelector(".szene.aktiv") === document.querySelector(".szene")));
      ok("… eine Netz-Stimme liest NICHT vor — dann gibt es nur Untertitel",
        await h.evaluate(() => window.speechSynthesis.getVoices() === window.__stimmen && window.__gesprochen.length === 0 && /Keine Stimme/.test(document.getElementById("stimme").textContent)));
      await h.click("#stopp");
      ok("■ Stopp beendet die Vorführung", await h.evaluate(() => document.getElementById("buehne").hidden && !window.__handbuch.laeuft()));
      await h.evaluate(() => window.__stimmen.push({ name: "Geräte-Stimme", lang: "de-DE", localService: true }));
      await h.click("#vorfuehren");
      await h.waitForFunction(() => window.__gesprochen.length >= 1);
      ok("… eine Stimme auf dem Gerät liest den Sprechtext vor", await h.evaluate(() => window.__gesprochen[0] === "Geräte-Stimme"));
      await h.keyboard.press("Escape");
      ok("… Esc beendet sie ebenfalls", await h.evaluate(() => !window.__handbuch.laeuft()));
    }
    await hCtx.close();
  }
  {
    const qCtx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true });
    const q = await qCtx.newPage(); await q.goto(BASIS + "sende-pruefer.html"); await bereit(q);
    await q.click("#hilfe"); await q.waitForURL(/handbuch\.html$/);
    ok("320 px: ein Tipp auf ? öffnet das Handbuch", q.url().endsWith("handbuch.html"));
    for (const [w, handy] of [[1280, false], [380, true], [320, true]]) {
      const ap = await browser.newPage({ viewport: { width: w, height: 800 }, hasTouch: handy, isMobile: handy });
      const aDraussen = []; ap.on("request", (r) => { if (!r.url().startsWith(BASIS)) aDraussen.push(r.url()); });
      await ap.goto(BASIS + "anleitung.html", { waitUntil: "load" });
      const a = await ap.evaluate(() => ({ ueber: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        teile: document.querySelectorAll("section.teil").length, bild: document.querySelector(".held img").naturalWidth,
        breiteTab: Math.round(document.querySelector(".tabelle table").getBoundingClientRect().right) }));
      ok(w + " px: die Anleitung läuft nicht quer über den Rand, auch die Tabelle nicht (nichts abgeschnitten)", a.ueber <= 0 && a.breiteTab <= w, JSON.stringify(a));
      ok(w + " px: … alle Abschnitte und das Icon stehen da, nichts geht nach draußen", a.teile >= 5 && a.bild > 0 && aDraussen.length === 0, JSON.stringify(a) + aDraussen.join(","));
      await ap.close();
    }
    await qCtx.close();
  }

  /* ── die Netz-Leiste: fest im Kopf, am Handy nur die Lampen (Klaus 2026-09-29) ── */
  const sichtbarIn = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sicht: e.checkVisibility() }; }, sel);
  for (const [breite, handy] of [[1280, false], [380, true], [320, true]]) {
    const nCtx = await browser.newContext({ serviceWorkers: "block", viewport: { width: breite, height: 800 }, hasTouch: handy, isMobile: handy });
    const n = await nCtx.newPage();
    await n.goto(BASIS + "sende-pruefer.html");
    await bereit(n);
    await n.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 30000 }).catch(() => {});
    await n.waitForTimeout(500);
    const lage = await n.evaluate(() => { const k = document.querySelector("header.kopf"), l = document.getElementById("netzleiste");
      return { ueber: k.scrollWidth - k.clientWidth, inKopf: k.contains(l), suche: Math.round(document.querySelector(".suche").getBoundingClientRect().width),
        blase: !!document.querySelector("[data-sbkim-mycel-platz] [data-sbkim-angedockt]") }; });
    ok(breite + " px: die Netz-Leiste steht IN der Kopfleiste, und nichts läuft über den Rand", lage.inKopf && lage.ueber === 0, JSON.stringify(lage));
    ok(breite + " px: … das Suchfeld behält mindestens 60 px", lage.suche >= 60, lage.suche);
    ok(breite + " px: … das ? zum Handbuch steht sichtbar in der Kopfleiste", (await sichtbarIn(n, "#hilfe") || {}).sicht === true);
    const hoehen = await n.evaluate(() => [...document.querySelectorAll("#lampen, header.kopf > .suche, header.kopf > .rund")].filter((e) => e.checkVisibility()).map((e) => (e.id || e.className) + ":" + Math.round(e.getBoundingClientRect().height)));
    ok(breite + " px: … Lampen, Suchfeld und Knöpfe sind gleich hoch (Klaus: nicht abgehackt)", hoehen.length >= 5 && new Set(hoehen.map((h) => h.split(":")[1])).size === 1, JSON.stringify(hoehen));
    ok(breite + " px: … die Mycel-Blase ist in ihrem Platz angedockt, nicht fliegend", lage.blase);
    const badge = await sichtbarIn(n, "#sbkim-siegel-badge");
    if (!handy) {
      ok(breite + " px: das Siegel steht ohne Klick sichtbar in der Leiste (28×28)", !!badge && badge.sicht && badge.w === 28 && badge.h === 28, JSON.stringify(badge));
      ok(breite + " px: … und die Lampen tragen ihre Namen", (await sichtbarIn(n, "#lamp-fremd .lamp-t")).sicht === true);
    } else {
      ok(breite + " px: zugeklappt stehen nur die Lampen — Siegel und Namen sind weg",
        !!badge && !badge.sicht && (await sichtbarIn(n, "#lamp-fremd .lamp-t")).sicht === false, JSON.stringify(badge));
      await n.click("#lampen");
      const offen = await sichtbarIn(n, "#sbkim-siegel-badge");
      const leg = await n.evaluate(() => [...document.querySelectorAll("[data-lampe-kopie]")].map((e) => e.checkVisibility() ? e.textContent : ""));
      const nachher = await n.evaluate(() => { const k = document.querySelector("header.kopf"); return k.scrollWidth - k.clientWidth; });
      ok(breite + " px: ein Tipp auf die Lampen klappt Siegel und Namen auf", !!offen && offen.sicht && offen.w === 28 && leg.join("|") === "lebt|verkehr|fremd", JSON.stringify({ offen, leg }));
      ok(breite + " px: … ohne die Kopfleiste zu sprengen", nachher === 0, nachher);
      ok(breite + " px: … und sagt es auch dem Vorleser (aria-expanded)", (await n.getAttribute("#lampen", "aria-expanded")) === "true");
      await n.mouse.click(breite / 2, 600);
      ok(breite + " px: ein Tipp daneben klappt wieder zu", (await sichtbarIn(n, "#sbkim-siegel-badge")).sicht === false);
      const frei = await n.evaluate(() => [...document.querySelectorAll("#bottomnav button, #fab")].filter((k) => k.checkVisibility()).map((k) => {
        const r = k.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!t && k.contains(t); }));
      ok(breite + " px: nichts verdeckt die Ordner-Leiste unten oder den ✏️-Knopf", frei.length >= 4 && frei.every(Boolean), JSON.stringify(frei));
    }
    await nCtx.close();
  }
} catch (e) {
  rot++; console.log("✗ ROT: unterwegs gestolpert → " + (e && e.stack || e));
} finally {
  await browser.close(); server.close(); ende();
}

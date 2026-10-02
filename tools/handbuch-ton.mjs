/* Sende-Prüfer — schneidet eine Sprachaufnahme in die Szenen des Handbuchs
 * (Klaus 2026-10-02: „eine professionelle Stimme … nicht die Browserstimme,
 * die so abgehackt klingt" · „Kannst du diese selber teilen?").
 *
 * Eingabe: EINE Aufnahme aller Sprechtexte der Reihe nach (wie sie aus
 * `handbuch/szenen.json` kommen). Geschnitten wird in einer PAUSE (ffmpeg
 * silencedetect): jedes Satzende bekommt eine Pause, Szenengrenzen sind die
 * Satzenden am Szenen-Ende (siehe unten). Der Schnitt liegt in der Mitte
 * der Pause. Sprechtexte: `sprech` (de) bzw. `sprechText.<sprache>`.
 *
 * ⚠ GEMESSEN WIRD NUR DIE LAGE, NICHT DER WORTLAUT. Ohne Spracherkennung
 * prüft das Werkzeug: jedes Satzende trifft eine Pause, und keine liegt
 * mehr als 2,5 s neben der Stelle, die die Zeichenzahl erwarten lässt.
 * Weicht etwas ab, sagt es das. Ob die Stimme den Text richtig liest,
 * hört nur ein Mensch.
 *
 * Aufruf:  node tools/handbuch-ton.mjs <aufnahme.mp3> [sprache=de]
 * Schreibt handbuch/ton/<sprache>/NN-<id>.mp3 und schnitte.json.
 * Danach: node tools/handbuch-bauen.mjs (hängt die Dateien an die Szenen).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SZENEN } from "./handbuch-szenen.mjs";

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [quelle, sprache = "de"] = process.argv.slice(2);
if (!quelle || !fs.existsSync(quelle)) { console.error("Aufruf: node tools/handbuch-ton.mjs <aufnahme.mp3> [sprache]"); process.exit(2); }
if (!/^[a-z]{2}$/.test(sprache)) { console.error("Sprache: zwei Buchstaben, z. B. de"); process.exit(2); }

/* Andrew (Englisch, 2026-10-02) macht zwischen zwei Absätzen NICHT länger
 * Pause als zwischen zwei Sätzen (gemessen: beides 0,40–0,46 s). Eine Grenze
 * „die nächste lange Pause" traf dort mitten in eine Szene. Zugeordnet wird
 * deshalb SATZ für Satz: jedes Satzende bekommt eine eigene Pause (≥ 0,3 s),
 * der Reihe nach, so dass die Summe der Abstände zur erwarteten Stelle
 * (Zeichenanteil × Dauer) am kleinsten ist; längere Pausen wiegen etwas
 * mehr. Pausen, die übrig bleiben, sind Kommas und Doppelpunkte. Die
 * Szenengrenzen sind dann die Satzenden am Ende einer Szene. */
const PAUSE_MIN = 0.3, ABWEICHUNG_MAX = 2.5, LANG_GEWICHT = 4;
const texte = SZENEN.map((s) => (sprache === "de" ? s.sprech : s.sprechText?.[sprache]));
const fehlt = SZENEN.filter((s, i) => !texte[i]).map((s) => s.id);
if (fehlt.length) { console.error(`✗ Kein Sprechtext „${sprache}" für: ${fehlt.join(", ")} (tools/handbuch-szenen.mjs, sprechText.${sprache})`); process.exit(2); }
const lauf = spawnSync("ffmpeg", ["-hide_banner", "-i", quelle, "-af", "silencedetect=noise=-40dB:d=0.2", "-f", "null", "-"], { encoding: "utf8" });
if (lauf.status !== 0) { console.error("✗ ffmpeg konnte die Aufnahme nicht lesen:\n" + lauf.stderr.slice(-400)); process.exit(1); }
const text = lauf.stderr;
const dauer = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", quelle], { encoding: "utf8" }).trim());
const pausen = [];
for (const m of text.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)) {
  const ende = Number(m[1]), d = Number(m[2]);
  if (d >= PAUSE_MIN && ende < dauer - 0.3) pausen.push({ mitte: ende - d / 2, ende, d });
}
/* Sätze der Reihe nach, je mit Szene und erwarteter Endzeit. */
const saetze = [];
texte.forEach((t, si) => t.split(/(?<=[.?])\s+/).forEach((x) => saetze.push({ si, n: x.length + 1 })));
const gesamt = saetze.reduce((a, b) => a + b.n, 0);
let summe = 0; saetze.forEach((x) => { summe += x.n; x.erwartet = (summe / gesamt) * dauer; });
const K = saetze.length - 1, M = pausen.length;
if (M < K) { console.error(`✗ ${K} Satzenden, aber nur ${M} Pausen ≥ ${PAUSE_MIN} s`); process.exit(1); }
const kosten = (k, j) => Math.abs(pausen[j].mitte - saetze[k].erwartet) - LANG_GEWICHT * pausen[j].d;
/* D[k][j]: beste Summe, wenn Satzende k auf Pause j liegt. */
const D = Array.from({ length: K }, () => new Float64Array(M).fill(Infinity));
const V = Array.from({ length: K }, () => new Int32Array(M).fill(-1));
for (let j = 0; j < M; j++) D[0][j] = kosten(0, j);
for (let k = 1; k < K; k++) {
  let best = Infinity, bj = -1;
  for (let j = k; j < M; j++) {
    if (D[k - 1][j - 1] < best) { best = D[k - 1][j - 1]; bj = j - 1; }
    if (bj >= 0) { D[k][j] = best + kosten(k, j); V[k][j] = bj; }
  }
}
let j = 0; for (let x = 1; x < M; x++) if (D[K - 1][x] < D[K - 1][j]) j = x;
const zuordnung = new Array(K);
for (let k = K - 1; k >= 0; k--) { zuordnung[k] = j; j = V[k][j]; }
const grenzen = [];
for (let k = 0; k < K; k++) if (saetze[k + 1].si !== saetze[k].si) grenzen.push({ ...pausen[zuordnung[k]], erwartet: saetze[k].erwartet });
const satzAb = saetze.slice(0, K).map((x, k) => Math.abs(pausen[zuordnung[k]].mitte - x.erwartet));
const ziel = path.join(W, "handbuch", "ton", sprache);
fs.rmSync(ziel, { recursive: true, force: true }); fs.mkdirSync(ziel, { recursive: true });
const zwei = (n) => String(n).padStart(2, "0");
/* Russisch (Svetlana, 2026-10-02): genau so viele Pausen ≥ PAUSE_MIN wie
 * Satzenden. Dann gibt es nur EINE Zuordnung — der Reihe nach —, und eine
 * große Abweichung heißt nur, dass das Sprechtempo vom Zeichenanteil
 * abweicht (gemessen: sie wuchs in Szene 06/07 stetig bis 3,9 s und fiel
 * danach wieder, kein Sprung). Das wird vermerkt, nicht verschwiegen; die
 * Grenze von 2,5 s bleibt für jede andere Aufnahme. */
const eindeutig = M === K;
const schnitte = []; let warnungen = 0;
SZENEN.forEach((s, i) => {
  const von = i ? grenzen[i - 1].mitte : 0, bis = i < grenzen.length ? grenzen[i].mitte : dauer;
  const sk = saetze.map((x, k) => k).filter((k) => k < K && saetze[k].si === i);
  const ab = sk.length ? Math.max(...sk.map((k) => satzAb[k])) : 0;
  const zahl = saetze.filter((x) => x.si === i).length;
  const passt = ab <= ABWEICHUNG_MAX;
  if (!passt) warnungen++;
  const datei = `${zwei(i + 1)}-${s.id}.mp3`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", quelle, "-ss", von.toFixed(3), "-to", bis.toFixed(3), "-c", "copy", path.join(ziel, datei)]);
  schnitte.push({ nr: i + 1, id: s.id, datei: `handbuch/ton/${sprache}/${datei}`, von: +von.toFixed(2), bis: +bis.toFixed(2), saetze: zahl, groessteAbweichung: +ab.toFixed(2) });
  console.log(`${passt ? "✓" : "⚠"} ${zwei(i + 1)} ${s.id.padEnd(11)} ${von.toFixed(2).padStart(7)} – ${bis.toFixed(2).padStart(7)} s · ${zahl} Sätze · Satzenden höchstens ${ab.toFixed(1)} s von der erwarteten Stelle`);
});
fs.writeFileSync(path.join(ziel, "schnitte.json"), JSON.stringify({
  hinweis: "Gebaut von tools/handbuch-ton.mjs aus einer Aufnahme aller Sprechtexte. Geschnitten in der Mitte einer Pause; gemessen ist die Lage, nicht der Wortlaut.",
  sprache, quelle: path.basename(quelle), dauer: +dauer.toFixed(2), pauseMin: PAUSE_MIN, abweichungMax: ABWEICHUNG_MAX, eindeutig, schnitte,
}, null, 1) + "\n");
if (eindeutig) console.log(`= ${M} Pausen für ${K} Satzenden: die Zuordnung ist eindeutig (der Reihe nach).`);
console.log(warnungen ? `⚠ ${warnungen} Szene(n) mit einem Satzende über ${ABWEICHUNG_MAX} s neben der erwarteten Stelle — bitte anhören.` : `${SZENEN.length} Szenen geschnitten, jedes Satzende liegt höchstens ${ABWEICHUNG_MAX} s neben der erwarteten Stelle.`);

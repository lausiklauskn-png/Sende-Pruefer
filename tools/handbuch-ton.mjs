/* Sende-Prüfer — schneidet eine Sprachaufnahme in die Szenen des Handbuchs
 * (Klaus 2026-10-02: „eine professionelle Stimme … nicht die Browserstimme,
 * die so abgehackt klingt" · „Kannst du diese selber teilen?").
 *
 * Eingabe: EINE Aufnahme aller Sprechtexte der Reihe nach (wie sie aus
 * `handbuch/szenen.json` kommen). Geschnitten wird in einer PAUSE (ffmpeg
 * silencedetect, ≥ 0,45 s): für jede Szenengrenze die Pause, die der
 * erwarteten Stelle am nächsten liegt — erwartet aus dem Anteil der Zeichen
 * bis dorthin. Der Schnitt liegt in der Mitte der Pause.
 *
 * ⚠ GEMESSEN WIRD NUR DIE LAGE, NICHT DER WORTLAUT. Ohne Spracherkennung
 * prüft das Werkzeug zweierlei: jede Grenze trifft eine Pause, und die
 * Zahl der langen Pausen IN einer Szene passt ungefähr zu ihren Sätzen.
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

const PAUSE_MIN = 0.45;
const lauf = spawnSync("ffmpeg", ["-hide_banner", "-i", quelle, "-af", "silencedetect=noise=-40dB:d=0.25", "-f", "null", "-"], { encoding: "utf8" });
if (lauf.status !== 0) { console.error("✗ ffmpeg konnte die Aufnahme nicht lesen:\n" + lauf.stderr.slice(-400)); process.exit(1); }
const text = lauf.stderr;
const dauer = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", quelle], { encoding: "utf8" }).trim());
const pausen = [];
for (const m of text.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)) {
  const ende = Number(m[1]), d = Number(m[2]);
  if (d >= PAUSE_MIN && ende < dauer - 0.3) pausen.push({ mitte: ende - d / 2, ende, d });
}
const laengen = SZENEN.map((s) => s.sprech.length), gesamt = laengen.reduce((a, b) => a + b, 0);
const grenzen = []; let summe = 0, frei = pausen.slice();
for (let i = 0; i < SZENEN.length - 1; i++) {
  summe += laengen[i];
  const erwartet = (summe / gesamt) * dauer;
  const nach = frei.filter((p) => p.mitte > (grenzen.at(-1)?.mitte ?? 0) + 1);
  if (!nach.length) { console.error(`✗ keine Pause mehr für die Grenze nach Szene ${i + 1}`); process.exit(1); }
  const p = nach.reduce((a, b) => (Math.abs(b.mitte - erwartet) < Math.abs(a.mitte - erwartet) ? b : a));
  grenzen.push({ ...p, erwartet });
}
const ziel = path.join(W, "handbuch", "ton", sprache);
fs.rmSync(ziel, { recursive: true, force: true }); fs.mkdirSync(ziel, { recursive: true });
const zwei = (n) => String(n).padStart(2, "0");
const schnitte = []; let warnungen = 0;
SZENEN.forEach((s, i) => {
  const von = i ? grenzen[i - 1].mitte : 0, bis = i < grenzen.length ? grenzen[i].mitte : dauer;
  const saetze = s.sprech.split(/(?<=[.?])\s+/).length;
  const innen = pausen.filter((p) => p.mitte > von + 0.1 && p.mitte < bis - 0.1).length;
  const passt = Math.abs(innen + 1 - saetze) <= 1;
  if (!passt) warnungen++;
  const datei = `${zwei(i + 1)}-${s.id}.mp3`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", quelle, "-ss", von.toFixed(3), "-to", bis.toFixed(3), "-c", "copy", path.join(ziel, datei)]);
  schnitte.push({ nr: i + 1, id: s.id, datei: `handbuch/ton/${sprache}/${datei}`, von: +von.toFixed(2), bis: +bis.toFixed(2), saetze, pausenInnen: innen });
  console.log(`${passt ? "✓" : "⚠"} ${zwei(i + 1)} ${s.id.padEnd(11)} ${von.toFixed(2).padStart(7)} – ${bis.toFixed(2).padStart(7)} s · ${saetze} Sätze · ${innen} lange Pausen darin`);
});
fs.writeFileSync(path.join(ziel, "schnitte.json"), JSON.stringify({
  hinweis: "Gebaut von tools/handbuch-ton.mjs aus einer Aufnahme aller Sprechtexte. Geschnitten in der Mitte einer Pause; gemessen ist die Lage, nicht der Wortlaut.",
  sprache, quelle: path.basename(quelle), dauer: +dauer.toFixed(2), pauseMin: PAUSE_MIN, schnitte,
}, null, 1) + "\n");
console.log(warnungen ? `⚠ ${warnungen} Szene(n) mit auffälliger Pausenzahl — bitte anhören.` : `${SZENEN.length} Szenen geschnitten, jede Pausenzahl passt zu ihren Sätzen.`);

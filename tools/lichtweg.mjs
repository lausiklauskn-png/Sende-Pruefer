#!/usr/bin/env node
/* Lichtweg — der Weg des Lichtscheins über dem großen Bild.
 *
 * Klaus hat den Weg am 2026-09-29 im Werkzeug „Lichtweg für den Sende-Prüfer"
 * selbst gezogen (drei Punkte, zwei Bögen). Seine Zahlen stehen unten in WEG,
 * wörtlich so, wie das Werkzeug sie ausgibt: Prozent vom Icon, 0/0 oben links.
 * Ein Bogen-Punkt liegt AUF der Kurve (in ihrer Mitte); der Kontrollpunkt der
 * quadratischen Kurve ist K = 2·G − (A+B)/2 — dieselbe Rechnung wie im Werkzeug.
 *
 * Aus dem Weg entsteht CSS, das die Seite und die Handbuch-Vorlage tragen:
 *   - licht-weg: SCHRITTE Punkte in GLEICHEM Abstand auf der Kurve, linear
 *     abgespielt — der Schein läuft ohne Halt und ohne Tempo-Sprung.
 *   - kegel: groß an Start, Mitte und Ende („aufblitzen"), dazwischen klein.
 *     In der Mitte über die ganze Höhe des Icons.
 *   - aufleuchten: das Schild leuchtet, wenn der Schein die Mitte erreicht,
 *     und der Boden darunter strahlt zurück: nicht als Fleck, sondern die hellen,
 *     farbigen Streifen der Spiegelung leuchten heller (Klaus 2026-09-29). Dafür
 *     liegt das Bild selbst ein zweites Mal darüber (plus-lighter: hell wird
 *     heller, dunkel bleibt dunkel), sichtbar nur durch die Maske Schild + Boden.
 *   - wackeln: das Icon hängt lose wie die Glas-Knöpfe in family-project
 *     (assets/app.js, wireHoloButtons): die Stelle, auf die der Schein fällt,
 *     gibt nach hinten nach. Der Mittelpunkt des Scheins spielt die Maus;
 *     dieselbe Rechnung: rotateY = (x − ½)·2·Max, rotateX = −(y − ½)·2·Max.
 *     Am Anfang und Ende jedes Durchlaufs schwingt es sanft auf null.
 *
 *   node tools/lichtweg.mjs              schreibt den Block in beide Dateien
 *   node tools/lichtweg.mjs --pruefen    sagt nur, ob beide auf dem Stand sind
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WEG = {
  start: [4.4, 58.6], bogen1: [31.5, 48.1], mitte: [52.5, 45.7], bogen2: [86.6, 52.6], ende: [88.8, 35.6],
};
export const DAUER = 3.5;        // Sekunden je Durchlauf (Klaus: „doppelte Geschwindigkeit")
export const SCHRITTE = 48;      // Punkte auf dem Weg
export const GRUND = 14;         // Größe des Scheins unterwegs, % vom Icon
export const BLITZ = 4;          // an Start, Mitte, Ende: das Vierfache (Klaus: „mindestens")
export const MITTE_HOCH = 100;   // in der Mitte: die ganze Höhe des Icons, in %
export const NEIGUNG = 12;       // Grad: so weit gibt das Icon unter dem Schein nach (family-project: 9 bei Knöpfen)
export const BODEN = { x: 50, y: 87, breite: 44, hoehe: 14 };  // wo der Boden zurückstrahlt, % vom Icon

const kontroll = (a, b, g) => [2 * g[0] - (a[0] + b[0]) / 2, 2 * g[1] - (a[1] + b[1]) / 2];
const quad = (a, k, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * k[0] + t * t * b[0], u * u * a[1] + 2 * u * t * k[1] + t * t * b[1]]; };

/** Der Weg als Punkte in gleichem Abstand; dazu, an welchem Anteil die Mitte liegt. */
export function abtasten(weg = WEG, n = SCHRITTE) {
  const k1 = kontroll(weg.start, weg.mitte, weg.bogen1), k2 = kontroll(weg.mitte, weg.ende, weg.bogen2);
  const dicht = []; let s = 0, alt = null, mitteS = 0;
  for (const [a, k, b, erster] of [[weg.start, k1, weg.mitte, true], [weg.mitte, k2, weg.ende, false]]) {
    for (let i = erster ? 0 : 1; i <= 2000; i++) {
      const p = quad(a, k, b, i / 2000);
      if (alt) s += Math.hypot(p[0] - alt[0], p[1] - alt[1]);
      dicht.push([p[0], p[1], s]); alt = p;
    }
    if (erster) mitteS = s;
  }
  const laenge = s, punkte = [];
  for (let i = 0, j = 0; i <= n; i++) {
    const ziel = laenge * i / n;
    while (j < dicht.length - 2 && dicht[j + 1][2] < ziel) j++;
    const a = dicht[j], b = dicht[j + 1], t = (ziel - a[2]) / ((b[2] - a[2]) || 1);
    punkte.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { punkte, mitte: mitteS / laenge, laenge };
}

const z = (v, d = 1) => String(Math.round(v * 10 ** d) / 10 ** d);

/** Der CSS-Block, der zwischen den Marken in beiden Dateien steht. */
export function cssBlock() {
  const { punkte, mitte } = abtasten();
  const m = mitte * 100;
  const weg = punkte.map((p, i) => `${z(i / SCHRITTE * 100, 2)}%{left:${z(p[0])}%;top:${z(p[1])}%}`).join("");
  const hoch = MITTE_HOCH / GRUND;
  const kegel = `0%{scale:${BLITZ};opacity:0}3%{opacity:1}${z(m / 2)}%{scale:1}${z(m)}%{scale:${BLITZ} ${z(hoch, 2)}}` +
    `${z(m + (100 - m) / 2)}%{scale:1}97%{opacity:1}100%{scale:${BLITZ};opacity:0}`;
  const leuchten = `0%,${z(m - 12)}%{opacity:0}${z(m)}%{opacity:.85}${z(m + 14)}%,100%{opacity:0}`;
  const [s0] = punkte;
  const glatt = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const wackeln = punkte.map((p, i) => {
    const f = i / SCHRITTE, e = Math.min(glatt(f / 0.1), glatt((1 - f) / 0.1));
    const ry = (p[0] / 100 - 0.5) * 2 * NEIGUNG * e, rx = -(p[1] / 100 - 0.5) * 2 * NEIGUNG * e;
    return `${z(f * 100, 2)}%{transform:perspective(900px) rotateX(${z(rx, 2)}deg) rotateY(${z(ry, 2)}deg)}`;
  }).join("");
  const B = BODEN;
  return [
    "/* LICHTWEG-ANFANG — gebaut von tools/lichtweg.mjs, nicht von Hand ändern.",
    "   Klaus' Weg (2026-09-29): unten links hinein, im Bogen zur Mitte, im Bogen oben rechts hinaus.",
    "   Gleicher Abstand je Schritt, linear: kein Halt. Groß an Start, Mitte, Ende; in der Mitte die ganze Höhe. */",
    `.bild-buehne::after{content:"";position:absolute;left:${z(s0[0])}%;top:${z(s0[1])}%;width:${GRUND}%;height:${GRUND}%;border-radius:50%;translate:-50% -50%;pointer-events:none;mix-blend-mode:screen;opacity:0;background:radial-gradient(closest-side,rgb(255 255 255/.75),rgb(255 255 255/.28) 45%,rgb(143 228 234/.14) 70%,transparent);animation:licht-weg ${DAUER}s linear infinite,kegel ${DAUER}s ease-in-out infinite}`,
    "/* … das Schild leuchtet auf, wenn der Schein die Mitte erreicht, und die Streifen am Boden strahlen heller zurück */",
    `.bild-buehne::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;background:radial-gradient(16% 30% at 50% 48%,rgb(255 255 255/.7),transparent),url(icons/sende-pruefer-bild.webp) 0 0/100% 100%;mix-blend-mode:plus-lighter;filter:saturate(1.3);-webkit-mask:radial-gradient(18% 32% at 50% 48%,#000 60%,transparent),radial-gradient(${B.breite / 2}% ${B.hoehe / 2}% at ${B.x}% ${B.y}%,#000 55%,transparent);mask:radial-gradient(18% 32% at 50% 48%,#000 60%,transparent),radial-gradient(${B.breite / 2}% ${B.hoehe / 2}% at ${B.x}% ${B.y}%,#000 55%,transparent);animation:aufleuchten ${DAUER}s ease-in-out infinite}`,
    "/* … und das Icon gibt unter dem Schein nach wie ein lose aufgehängter Knopf */",
    `.bild-buehne{--wackeln:wackeln ${DAUER}s linear infinite;animation:var(--wackeln)}`,
    `@keyframes wackeln{${wackeln}}`,
    `@keyframes licht-weg{${weg}}`,
    `@keyframes kegel{${kegel}}`,
    `@keyframes aufleuchten{${leuchten}}`,
    "/* LICHTWEG-ENDE */",
  ].join("\n");
}

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATEIEN = ["sende-pruefer.html", "tools/handbuch-vorlage.html"];
const MUSTER = /\/\* LICHTWEG-ANFANG[\s\S]*?\/\* LICHTWEG-ENDE \*\//;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const block = cssBlock(), pruefen = process.argv.includes("--pruefen");
  let alt = 0;
  for (const d of DATEIEN) {
    const f = path.join(W, d), text = fs.readFileSync(f, "utf8");
    if (!MUSTER.test(text)) { console.error(`✗ ${d}: keine LICHTWEG-Marken`); process.exit(2); }
    const neu = text.replace(MUSTER, () => block);
    if (neu === text) { console.log(`✓ ${d} ist auf dem Stand`); continue; }
    alt++;
    if (pruefen) console.log(`✗ ${d} weicht ab`); else { fs.writeFileSync(f, neu); console.log(`✎ ${d} neu geschrieben`); }
  }
  process.exit(pruefen && alt ? 1 : 0);
}

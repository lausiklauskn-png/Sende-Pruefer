#!/usr/bin/env node
/* Anleitung — LIESMICH.md als Seite im Stil des Handbuchs (Klaus 2026-09-29:
 * „Das ist eine MD-Datei. Ich hätte gern … im Stile des gesamten Handbuches.").
 *
 * LIESMICH.md bleibt die QUELLE und gehört weiter zu den vier Dateien unter
 * 96 KB. anleitung.html wird daraus GEBAUT — nicht von Hand ändern, sonst ist es
 * beim nächsten Bau weg, und die Probe meldet „veraltet".
 *
 * Gelesen wird nur die Teilmenge, die LIESMICH.md trägt: # und ## Überschriften,
 * Absätze, **fett**, `code`, nummerierte Listen mit eingerückten Unterpunkten
 * und eine Tabelle. Alles wird ZUERST maskiert (&, <, >, "), erst danach werden
 * die Auszeichnungen gesetzt — ein „<b>" im Text bleibt Text.
 *
 *   node tools/anleitung-bauen.mjs            schreibt anleitung.html
 *   node tools/anleitung-bauen.mjs --pruefen  sagt nur, ob sie auf dem Stand ist
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const QUELLE = "LIESMICH.md", ZIEL = "anleitung.html";

const maske = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function zeile(s) {
  return maske(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}
const anker = (t) => t.toLowerCase().replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c])
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Zerlegt die Markdown-Datei in Titel, Einleitung und Abschnitte (je ## einer). */
export function zerlegen(md) {
  const zeilen = md.replace(/\r/g, "").split("\n");
  let titel = "", i = 0; const einleitung = [], abschnitte = [];
  let ziel = einleitung;
  for (; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (/^# /.test(z)) { titel = z.slice(2).trim(); continue; }
    if (/^## /.test(z)) { const t = z.slice(3).trim(); ziel = []; abschnitte.push({ titel: t, id: anker(t), zeilen: ziel }); continue; }
    ziel.push(z);
  }
  return { titel, einleitung, abschnitte };
}

/** Blöcke eines Abschnitts: Absätze, Listen, Tabellen. */
export function bloecke(zeilen) {
  const out = []; let i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (!z.trim()) { i++; continue; }
    if (/^\|/.test(z)) {
      const t = [];
      while (i < zeilen.length && /^\|/.test(zeilen[i])) t.push(zeilen[i++]);
      const zellen = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      out.push({ art: "tabelle", kopf: zellen(t[0]), reihen: t.slice(2).map(zellen) });
      continue;
    }
    if (/^\d+\. /.test(z)) {
      const punkte = [];
      while (i < zeilen.length && (/^\d+\. /.test(zeilen[i]) || /^\s+- /.test(zeilen[i]))) {
        const l = zeilen[i++];
        if (/^\d+\. /.test(l)) punkte.push({ text: l.replace(/^\d+\. /, ""), unter: [] });
        else punkte[punkte.length - 1].unter.push(l.replace(/^\s+- /, ""));
      }
      out.push({ art: "liste", punkte });
      continue;
    }
    const absatz = [];
    while (i < zeilen.length && zeilen[i].trim() && !/^\||^\d+\. /.test(zeilen[i])) absatz.push(zeilen[i++].trim());
    out.push({ art: "absatz", text: absatz.join(" ") });
  }
  return out;
}

function blockHtml(b, abschnitt) {
  if (b.art === "absatz") {
    // „**1 · Titel.** Text" im Abschnitt „Wann man dazu greift" wird eine Fall-Karte
    const fall = b.text.match(/^\*\*(\d+) · ([^*]+)\*\*\s*(.*)$/);
    if (fall && /wann/i.test(abschnitt)) return `<div class="fall"><span class="nr">${fall[1]}</span><div><h3>${zeile(fall[2])}</h3><p>${zeile(fall[3])}</p></div></div>`;
    return `<p>${zeile(b.text)}</p>`;
  }
  if (b.art === "liste") {
    const art = /grenzen/i.test(abschnitt) ? "grenzen" : "schritte";
    return `<ol class="${art}">` + b.punkte.map((p) =>
      `<li>${zeile(p.text)}${p.unter.length ? "<ul>" + p.unter.map((u) => `<li>${zeile(u)}</li>`).join("") + "</ul>" : ""}</li>`).join("") + "</ol>";
  }
  // Tabelle: am Handy werden die Reihen zu Karten (data-titel trägt den Spaltennamen)
  return `<div class="tabelle"><table><thead><tr>${b.kopf.map((k) => `<th>${zeile(k)}</th>`).join("")}</tr></thead><tbody>` +
    b.reihen.map((r) => `<tr>${r.map((c, j) => `<td data-titel="${maske(b.kopf[j] || "")}">${j === 0 ? `<span class="sorte">${zeile(c)}</span>` : zeile(c)}</td>`).join("")}</tr>`).join("") +
    "</tbody></table></div>";
}

export function bauen(md = fs.readFileSync(path.join(W, QUELLE), "utf8")) {
  const { titel, einleitung, abschnitte } = zerlegen(md);
  const nav = abschnitte.map((a, i) => `<a href="#${a.id}"><span>${i + 1}</span>${zeile(a.titel)}</a>`).join("\n  ");
  const teile = abschnitte.map((a, i) =>
    `<section class="teil" id="${a.id}">\n <div class="kopfzeile"><span class="nr">${String(i + 1).padStart(2, "0")}</span><h2>${zeile(a.titel)}</h2></div>\n ` +
    bloecke(a.zeilen).map((b) => blockHtml(b, a.titel)).join("\n ") + "\n</section>").join("\n");
  const einl = bloecke(einleitung).map((b) => blockHtml(b, "")).join("");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Sende-Prüfer · Anleitung und Grenzen</title>
<meta name="description" content="Anleitung zum Sende-Prüfer: wann man dazu greift, wie es geht, was erkannt wird — und was die Seite nicht kann.">
<meta name="theme-color" content="#0b1418">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
<!-- GEBAUT von tools/anleitung-bauen.mjs aus LIESMICH.md. Nicht von Hand ändern: beim nächsten Bau wäre es weg. -->
<style>
:root{--bg:#0b1418;--fl:#122128;--fl2:#17303a;--linie:#24414b;--schrift:#e8f0f3;--leise:#9db3bb;--petrol:#5cc2c9;--glanz:#8fe4ea;--gold:#f3b54a;--gold2:#ffd98a;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:16px}
body{margin:0;background:var(--bg);color:var(--schrift);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
 background:radial-gradient(60vw 40vw at 85% -10%,rgb(92 194 201/.18),transparent 70%),radial-gradient(50vw 40vw at -10% 110%,rgb(243 181 74/.12),transparent 70%)}
a{color:var(--glanz)}
b{color:#fff}
code{font:600 .9em ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--gold2);background:rgb(243 181 74/.12);padding:1px 5px;border-radius:6px;overflow-wrap:anywhere}
.held{position:relative;padding:48px 20px 28px;text-align:center;max-width:980px;margin:0 auto}
.held .zurueck{position:absolute;left:16px;top:14px;font-size:.92rem;text-decoration:none;color:var(--leise)}
.held img{width:72px;height:72px;border-radius:18px;box-shadow:0 12px 30px rgb(0 0 0/.5)}
.held h1{margin:12px 0 10px;font-size:clamp(1.9rem,5vw,3rem);line-height:1.1;letter-spacing:-.02em;
 background:linear-gradient(100deg,var(--glanz),#fff 45%,var(--gold2));-webkit-background-clip:text;background-clip:text;color:transparent}
.held .unter{color:var(--leise);margin:0 auto 22px;max-width:680px;text-align:left}
.knoepfe{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.knopf{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--linie);
 background:linear-gradient(180deg,var(--fl2),var(--fl));color:var(--schrift);font:600 .98rem system-ui,sans-serif;text-decoration:none;
 box-shadow:inset 0 1px 0 rgb(255 255 255/.12),0 6px 18px rgb(0 0 0/.3)}
.knopf.haupt{border-color:var(--gold);background:linear-gradient(180deg,#3a2c12,#231a0b);color:var(--gold2)}
.knopf:hover{border-color:var(--petrol)}
.rahmen{display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;max-width:1180px;margin:0 auto;padding:0 20px 60px}
.film{position:sticky;top:16px;align-self:start;display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid var(--linie);border-radius:18px;background:rgb(18 33 40/.8)}
.film::before{content:"Inhalt";font:700 .72rem system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--leise);padding:2px 8px 6px}
.film a{display:flex;gap:10px;align-items:center;padding:7px 10px;border-radius:10px;color:var(--leise);text-decoration:none;font-size:.9rem;line-height:1.25}
.film a span{font:700 .78rem ui-monospace,Menlo,monospace;color:var(--petrol);min-width:2ch}
.film a:hover{background:var(--fl2);color:var(--schrift)}
.teile{display:flex;flex-direction:column;gap:48px;min-width:0}
.teil{scroll-margin-top:16px;padding:22px 24px;border:1px solid var(--linie);border-radius:20px;background:linear-gradient(180deg,rgb(23 48 58/.55),rgb(18 33 40/.55));box-shadow:0 24px 50px rgb(0 0 0/.3)}
.kopfzeile{display:flex;align-items:baseline;gap:14px;margin-bottom:10px}
.kopfzeile .nr{font:800 2.6rem/1 ui-monospace,Menlo,monospace;color:transparent;-webkit-text-stroke:1.5px var(--gold);opacity:.9}
.kopfzeile h2{margin:0;font-size:clamp(1.25rem,3vw,1.7rem)}
.teil p{margin:12px 0}
.fall{display:flex;gap:14px;align-items:flex-start;margin:14px 0;padding:14px 16px;border-radius:14px;border-left:3px solid var(--petrol);background:rgb(92 194 201/.08)}
.fall .nr{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--petrol);color:#062026;font:800 1rem system-ui}
.fall h3{margin:2px 0 4px;font-size:1.05rem;color:var(--glanz)}
.fall p{margin:0}
ol{margin:14px 0;padding:0;list-style:none;counter-reset:n;display:flex;flex-direction:column;gap:10px}
ol>li{counter-increment:n;position:relative;padding:12px 14px 12px 52px;border-radius:14px;border:1px solid var(--linie);background:rgb(11 20 24/.45)}
ol>li::before{content:counter(n);position:absolute;left:12px;top:11px;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;
 font:800 .9rem system-ui;color:#062026;background:var(--petrol)}
ol.grenzen>li{border-color:rgb(243 181 74/.35);background:rgb(243 181 74/.06)}
ol.grenzen>li::before{background:var(--gold);box-shadow:0 0 16px rgb(243 181 74/.4)}
ol ul{margin:8px 0 0;padding-left:18px}
ol ul li{margin:6px 0}
.tabelle{margin:14px 0;border:1px solid var(--linie);border-radius:14px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{text-align:left;font:700 .75rem system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--leise);background:var(--fl2);padding:10px 14px}
td{padding:11px 14px;border-top:1px solid var(--linie);vertical-align:top}
.sorte{font:800 .82rem ui-monospace,Menlo,monospace;color:var(--gold2);letter-spacing:.04em}
.grenzen-fuss{max-width:1180px;margin:0 auto 40px;padding:22px 20px;border-top:1px solid var(--linie);color:var(--leise)}
@media (max-width:900px){
 .rahmen{grid-template-columns:minmax(0,1fr)}
 .film{position:static;flex-direction:row;flex-wrap:wrap}
 .film::before{width:100%}
 .film a{flex:0 1 auto;min-width:0}
}
@media (max-width:560px){
 .teil{padding:18px 14px}
 .kopfzeile .nr{font-size:2rem}
 ol>li{padding-left:46px}
 /* Tabelle am Handy: jede Reihe eine Karte, damit nichts quer läuft */
 .tabelle{border:0;border-radius:0}
 table,thead,tbody,tr,td{display:block;width:100%}
 thead{display:none}
 tr{margin:0 0 10px;border:1px solid var(--linie);border-radius:12px;background:rgb(11 20 24/.45);overflow:hidden}
 td{border:0;padding:6px 12px}
 td:first-child{background:var(--fl2)}
 td+td::before{content:attr(data-titel) ": ";color:var(--leise);font-size:.8rem}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header class="held">
 <a class="zurueck" href="sende-pruefer.html">← Zur App</a>
 <img src="icons/marke-72.png" width="72" height="72" alt="">
 <h1>${zeile(titel.replace(/\s*—\s*Anleitung$/, "")) } · Anleitung und Grenzen</h1>
 <div class="unter">${einl}</div>
 <div class="knoepfe">
  <a class="knopf haupt" href="sende-pruefer.html">Zur App</a>
  <a class="knopf" href="handbuch.html">Handbuch mit Bildern</a>
  <a class="knopf" href="#grenzen-was-die-seite-nicht-kann">Die Grenzen</a>
 </div>
</header>

<div class="rahmen">
 <nav class="film" aria-label="Inhalt">
  ${nav}
 </nav>
 <div class="teile">
${teile}
 </div>
</div>

<footer class="grenzen-fuss">
 <p>Diese Seite ist aus <a href="LIESMICH.md">LIESMICH.md</a> gebaut und sagt dasselbe. Sie holt nichts aus dem Netz.</p>
</footer>
</body>
</html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const neu = bauen(), f = path.join(W, ZIEL);
  const alt = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
  if (alt === neu) { console.log(`✓ ${ZIEL} ist auf dem Stand`); process.exit(0); }
  if (process.argv.includes("--pruefen")) { console.log(`✗ ${ZIEL} weicht von ${QUELLE} ab — node tools/anleitung-bauen.mjs`); process.exit(1); }
  fs.writeFileSync(f, neu); console.log(`✎ ${ZIEL} neu geschrieben`);
}

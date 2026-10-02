/* Sende-Prüfer — baut das Handbuch aus der echten App (Klaus 2026-09-29).
 *
 * „so aufgebaut, dass später eine Videosequenz es besser erklärt, mit Bildern“
 * — nach dem Vorbild von Workflow PDF: die Bilder sind ECHTE Bildschirmfotos,
 * im Browser aufgenommen, mit der erfundenen Beispiel-Mail. Jede Szene aus
 * `tools/handbuch-szenen.mjs` wird zu:
 *   handbuch/NN-<id>.jpg      das Bild
 *   handbuch.html             eine Szene mit Lesetext, Sprechtext und Leuchtring
 *   handbuch/szenen.json      dieselbe Liste für ein späteres Video
 * Liegt unter handbuch/ton/de/NN-<id>.mp3 eine Aufnahme (tools/handbuch-ton.mjs),
 * trägt die Szene sie als data-ton; „▶ Vorführen" spielt dann sie statt einer
 * Browser-Stimme. Englisch (Klaus 2026-10-02): `sprechText.en` wird zu
 * data-sprech-en, handbuch/ton/en/NN-<id>.mp3 zu data-ton-en; „▶ Watch in
 * English" erscheint nur, wenn JEDE Szene einen englischen Text trägt.
 *
 * Kein Netz: jeder Aufruf nach draußen wird abgewiesen.
 * Aufruf:  node tools/handbuch-bauen.mjs   (braucht playwright-core)
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findeChromium } from "../tests/chromium-finden.mjs";
import { SZENEN } from "./handbuch-szenen.mjs";

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(W, "handbuch");
fs.mkdirSync(ZIEL, { recursive: true });
for (const f of fs.readdirSync(ZIEL)) if (/\.jpg$/.test(f)) fs.unlinkSync(path.join(ZIEL, f));

const typ = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  const f = path.join(W, p); if (!f.startsWith(W) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { "Content-Type": typ[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASIS = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch({ executablePath: findeChromium() });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const zwei = (n) => String(n).padStart(2, "0");
const liste = [];

for (const [i, s] of SZENEN.entries()) {
  const ctx = await browser.newContext({ viewport: s.ansicht, locale: "de-DE", colorScheme: "dark", deviceScaleFactor: 1, reducedMotion: "reduce" }); // „weniger Bewegung“: kein Bild mitten im Flug auf dem Foto
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const fehler = []; page.on("pageerror", (e) => fehler.push(String(e)));
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
  await s.aufbau(page);
  await page.waitForTimeout(250); // ein Bild Ruhe nach dem letzten Zeichnen — nur fürs Foto, nicht zum Messen
  const el = page.locator(s.ziel).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const b = await el.boundingBox();
  if (!b) throw new Error(`Szene ${s.id}: Ziel ${s.ziel} nicht zu sehen`);
  const vw = s.ansicht.width, vh = s.ansicht.height;
  const pct = (v, g) => Math.round(Math.max(0, Math.min(100, (v / g) * 100)) * 10) / 10;
  const ring = { x: pct(b.x, vw), y: pct(b.y, vh), w: pct(Math.min(b.width, vw - b.x), vw), h: pct(Math.min(b.height, vh - Math.max(0, b.y)), vh) };
  const datei = `handbuch/${zwei(i + 1)}-${s.id}.jpg`;
  await page.screenshot({ path: path.join(W, datei), type: "jpeg", quality: 80 });
  if (fehler.length) throw new Error(`Szene ${s.id}: ${fehler.join(" | ")}`);
  const tonDatei = `handbuch/ton/de/${zwei(i + 1)}-${s.id}.mp3`;
  const ton = fs.existsSync(path.join(W, tonDatei)) ? tonDatei : null;
  const tonEnDatei = `handbuch/ton/en/${zwei(i + 1)}-${s.id}.mp3`;
  const sprechEn = s.sprechText?.en || null;
  const tonEn = sprechEn && fs.existsSync(path.join(W, tonEnDatei)) ? tonEnDatei : null;
  liste.push({ nr: i + 1, id: s.id, titel: s.titel, text: s.text, sprech: s.sprech, bild: datei, ton, sprechEn, tonEn, breite: vw, hoehe: vh, handy: vw < 600, ring });
  await ctx.close();
  console.log(`  ✓ ${zwei(i + 1)} ${s.titel}`);
}
await browser.close(); srv.close();

fs.writeFileSync(path.join(ZIEL, "szenen.json"), JSON.stringify({
  hinweis: "Szenenliste des Sende-Prüfer-Handbuchs. Gebaut von tools/handbuch-bauen.mjs — nicht von Hand ändern. Für ein späteres Erklärvideo: je Szene ein Bild, ein Sprechtext, ein Ziel (Leuchtring, Prozent des Bildes).",
  szenen: liste.map(({ text, ...r }) => r),
}, null, 1) + "\n");

const szenenHtml = liste.map((s) => `
<section class="szene${s.handy ? " hoch" : ""}" id="szene-${s.id}" data-szene="${s.id}" data-nr="${s.nr}"${s.ton ? ` data-ton="${s.ton}"` : ""}${s.sprechEn ? ` data-sprech-en="${esc(s.sprechEn)}"` : ""}${s.tonEn ? ` data-ton-en="${s.tonEn}"` : ""}>
 <div class="kopfzeile"><span class="nr">${zwei(s.nr)}</span><h2>${esc(s.titel)}</h2></div>
 <figure class="bild">
  <img src="${s.bild}" width="${s.breite}" height="${s.hoehe}" alt="${esc(s.titel)} — Bildschirmfoto der App" loading="${s.nr > 2 ? "lazy" : "eager"}" decoding="async">
  <span class="ring" data-ring style="left:${s.ring.x}%;top:${s.ring.y}%;width:${s.ring.w}%;height:${s.ring.h}%"></span>
 </figure>
 <p class="text">${s.text}</p>
 <p class="sprech" data-sprech><span class="mikro" aria-hidden="true">🎙</span> ${esc(s.sprech)}</p>
</section>`).join("\n");

const navHtml = liste.map((s) => `<a href="#szene-${s.id}" data-zu="${s.id}"><span>${zwei(s.nr)}</span> ${esc(s.titel)}</a>`).join("");

const html = fs.readFileSync(path.join(W, "tools", "handbuch-vorlage.html"), "utf8")
  .replace("<!--SZENEN-->", szenenHtml)
  .replace("<!--NAV-->", navHtml)
  .replace(/<!--ANZAHL-->/g, String(liste.length))
  .replace("<!--ENGLISCH-->", liste.every((s) => s.sprechEn) ? `<button class="knopf" id="vorfuehren-en" type="button" lang="en">▶ Watch in English</button>` : "");
fs.writeFileSync(path.join(W, "handbuch.html"), html);
console.log(`handbuch.html · ${liste.length} Szenen · handbuch/szenen.json`);

/*
 * anhaenge.mjs — die Anhang-Prüfung (assets/anhaenge.js), aufgerufen aus
 * smoke.mjs. Zwei Hälften: ohne Browser (genau der Code, den der Browser
 * ausführt, an gebauten Dateien) und im Browser (hinzufügen, sehen,
 * sichere Fassung, .eml mit Anhang, nach dem Neuladen noch da).
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as M from "./anhang-muster.mjs";

/* byte-1:1 aus Auslieferung-Pruefer (6ba2d11) — dort pflegen, hier neu kopieren */
export const FORMATE_SHA = "35c306737446e93326f6d7c6cd8c7a91d04a02b53755a4bd2da0e26d46c16e84";

/* byte-1:1 aus Auslieferung-Pruefer (bb0ad61) — dort pflegen, hier neu kopieren */
export const ANHANG_SHA = "b5ba293c5bfd82b8a63b5d3b6231b1204e96570c2b91ba3dbd4af890f7ebf044";

const kennungen = (r) => r.befunde.map((x) => x.kennung);

export async function ohneBrowser(ok, WURZEL) {
  const b = readFileSync(join(WURZEL, "assets/pruefer-formate.js"));
  ok("assets/pruefer-formate.js ist unverändert (SHA-256 gepinnt, aus dem Auslieferungsprüfer)", createHash("sha256").update(b).digest("hex") === FORMATE_SHA);
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), html = readFileSync(join(WURZEL, "sende-pruefer.html"), "utf8");
  ok("assets/pruefer-anhang.js ist unverändert (SHA-256 gepinnt, aus dem Auslieferungsprüfer)", createHash("sha256").update(readFileSync(join(WURZEL, "assets/pruefer-anhang.js"))).digest("hex") === ANHANG_SHA);
  ok("die Anhang-Prüfung, ihr Prüfteil und der PDF-Prüfer stehen im Offline-Vorrat", sw.includes('"assets/anhaenge.js"') && sw.includes('"assets/pruefer-anhang.js"') && sw.includes('"assets/pruefer-formate.js"'));
  ok("die Seite lädt die Anhang-Prüfung vor ihrem eigenen Skript",
    html.indexOf('<script src="assets/anhaenge.js"></script>') > 0 && html.indexOf('<script src="assets/anhaenge.js"></script>') < html.indexOf("<script>\n\"use strict\""));
  delete globalThis.SPAnhang; delete globalThis.PrueferAnhang; delete globalThis.PrueferFormate;
  await import(pathToFileURL(join(WURZEL, "assets/pruefer-formate.js")).href + "?" + Date.now());
  await import(pathToFileURL(join(WURZEL, "assets/pruefer-anhang.js")).href + "?" + Date.now());
  await import(pathToFileURL(join(WURZEL, "assets/anhaenge.js")).href + "?" + Date.now());
  const A = globalThis.PrueferAnhang;
  ok("der Prüfteil lädt auch ohne Browser (PrueferAnhang.pruefe) — genau die Kopie, die der Browser nachlädt", !!A && typeof A.pruefe === "function");
  /* Die Oberfläche trägt keinen eigenen Prüfteil mehr: eine zweite Fassung liefe auseinander. */
  const ui = readFileSync(join(WURZEL, "assets/anhaenge.js"), "utf8");
  ok("assets/anhaenge.js trägt keine eigene Prüfung mehr, sondern lädt pruefer-anhang.js nach",
    !/function (pngPruefen|jpegPruefen|svgPruefen|officePruefen|zipEintraege)\b/.test(ui) && /s\.src = "assets\/pruefer-anhang\.js"/.test(ui));
  if (!A) return;
  const p = (n, x) => A.pruefe(n, x);

  let r = await p("foto.png", M.png({ text: "Author\0Eva", hinten: "GEHEIM ".repeat(20) }));
  ok("PNG: Daten hinter dem Bildende werden gemeldet (BILD-ANHAENGSEL)", kennungen(r).includes("BILD-ANHAENGSEL"), JSON.stringify(r.befunde));
  ok("PNG: ein Text-Feld in den Metadaten wird gemeldet (BILD-METADATEN)", kennungen(r).includes("BILD-METADATEN"));
  r = await p("sauber.png", M.png());
  ok("PNG ohne Zusätze: kein Befund (Gegenrichtung)", r.befunde.length === 0, JSON.stringify(r.befunde));
  r = await p("sauber.png", M.png({ hinten: Buffer.alloc(40) }));
  ok("… und ein paar Füllbytes hinten sind kein Anhängsel", r.befunde.length === 0, JSON.stringify(r.befunde));
  r = await p("kamera.jpg", M.jpegGeruest({ hinten: Buffer.concat([Buffer.alloc(4), Buffer.from("ftypmp42"), Buffer.alloc(200, 7)]) }));
  ok("JPEG: EXIF mit Ortsangabe wird als GPS gemeldet", r.befunde.some((x) => x.kennung === "BILD-METADATEN" && /GPS/.test(x.satz)), JSON.stringify(r.befunde));
  ok("JPEG: ein angehängtes Video (Bewegungsfoto) wird benannt", r.befunde.some((x) => x.kennung === "BILD-ANHAENGSEL" && /Bewegungsfoto/.test(x.satz)));
  r = await p("kamera.jpg", M.jpegGeruest({ gps: false }));
  ok("JPEG ohne GPS-Verweis: keine erfundene Ortsangabe", r.befunde.length === 1 && !/GPS/.test(r.befunde[0].satz), JSON.stringify(r.befunde));
  r = await p("logo.svg", Buffer.from(M.SVG_BOESE));
  ok("SVG: Skript und Ereignis-Auslöser werden gemeldet (SVG-SKRIPT)", kennungen(r).filter((k) => k === "SVG-SKRIPT").length === 2, JSON.stringify(r.befunde));
  ok("SVG: ein Abruf von einem fremden Rechner wird gemeldet (SVG-VERWEIS)", r.befunde.some((x) => x.kennung === "SVG-VERWEIS" && /bilder\.example/.test(x.satz)));
  ok("SVG: der sichtbare Text geht an Modul 25, das Skript nicht", /DE89 3704/.test(r.text || "") && !/abgreifer/.test(r.text || ""), r.text);
  r = await p("ok.svg", Buffer.from(M.SVG_SAUBER));
  ok("SVG ohne Skript: kein Befund", r.befunde.length === 0);
  for (const packen of [true, false]) {
    r = await p("brief.docx", M.docxBoese(packen));
    const w = packen ? " (gepackt)" : " (gespeichert)";
    ok("Word" + w + ": als Word-Dokument erkannt", r.art === "docx", r.art);
    ok("Word" + w + ": Makros werden gemeldet (OFFICE-MAKRO)", kennungen(r).includes("OFFICE-MAKRO"));
    ok("Word" + w + ": eine Vorlage von außen wird gemeldet (OFFICE-VERWEIS)", r.befunde.some((x) => x.kennung === "OFFICE-VERWEIS" && /vorlagen\.example/.test(x.satz)));
    ok("Word" + w + ": der Text samt Verfasser geht an Modul 25", /DE89 3704 0044 0532 0130 00/.test(r.text || "") && /\+49 170 1234567 & Dank/.test(r.text || "") && /Eva Muster/.test(r.text || ""), r.text);
  }
  r = await p("ok.docx", M.docxSauber());
  ok("Word ohne Makro und Verweis: kein Befund", r.befunde.length === 0 && /Angebot/.test(r.text || ""), JSON.stringify(r));
  r = await p("r.pdf", M.PDF_BOESE);
  ok("PDF: JavaScript und Aktion beim Öffnen werden gemeldet (über pruefer-formate.js)", kennungen(r).includes("PDF-AKTION") && r.befunde.some((x) => /beim Öffnen/.test(x.satz)), JSON.stringify(r.befunde));
  ok("PDF: die Grenze (Seitentext nicht gelesen) wird gesagt", r.hinweise.some((h) => /Seitentext/.test(h)));
  r = await p("rechnung.pdf.exe", M.PROGRAMM);
  ok("ein Programm wird gemeldet, auch mit doppelter Endung (ANHANG-PROGRAMM, ANHANG-TARNUNG)", kennungen(r).includes("ANHANG-PROGRAMM") && kennungen(r).includes("ANHANG-TARNUNG"), JSON.stringify(r.befunde));
  r = await p("brief.pdf", M.PROGRAMM);
  ok("ein Programm, das sich als .pdf ausgibt, wird am Dateikopf erkannt", kennungen(r).includes("ANHANG-PROGRAMM") && kennungen(r).includes("ANHANG-TARNUNG"), JSON.stringify(r.befunde));
  r = await p("urlaub.jpg", M.png());
  ok("eine Endung, die nicht zum Dateikopf passt, wird gemeldet", r.befunde.some((x) => x.kennung === "ANHANG-TARNUNG" && /PNG/.test(x.satz)), JSON.stringify(r.befunde));
  r = await p("bild.jpeg", M.jpegGeruest({ gps: false }));
  ok("… und .jpeg zu einem JPEG ist keine Tarnung", !kennungen(r).includes("ANHANG-TARNUNG"));
}

export async function imBrowser(ok, browser, BASIS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(), draussen = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { draussen.push(route.request().url()); return route.abort(); });
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  await page.click("#neu"); await page.waitForSelector("#text");
  await page.fill("#text", "Hallo, anbei die Unterlagen."); await page.fill("#namen", "Petra Beispiel");
  /* Das Seiten-Skript speichert 250 ms nach dem Tippen die ganze Mail — käme
     dieser Rest NACH den Anhängen, nähme er sie mit, und „die Anhang-Prüfung
     speichert selbst" wäre nicht gemessen (Gegenprobe 2026-09-29: blind). */
  await page.waitForTimeout(600);
  const lage = await page.evaluate(() => { const a = document.getElementById("anhaenge"), k = document.getElementById("ki-oeffnen");
    return { da: !!a && a.checkVisibility(), vorKi: !!a && !!k && !!(a.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  ok("Anhänge: der Abschnitt steht in der geöffneten Mail, vor „Mit KI“", lage.da && lage.vorKi, JSON.stringify(lage));
  ok("Anhänge: … sagt zuerst, wofür, und nennt die Grenzen", /nicht mehr verrät/.test(await page.textContent("[data-anhang-zweck]")) && /kein Virenscanner/.test(await page.textContent("[data-anhang-grenze]")));
  const b64 = (x) => Buffer.from(x);
  await page.setInputFiles("#anhang-datei", [
    { name: "logo.svg", mimeType: "image/svg+xml", buffer: b64(M.SVG_BOESE) },
    { name: "foto.png", mimeType: "image/png", buffer: M.png({ w: 40, h: 30, text: "Author\0Eva", hinten: "GEHEIM ".repeat(20) }) },
    { name: "brief.docx", mimeType: "application/octet-stream", buffer: M.docxBoese() },
    { name: "r.pdf", mimeType: "application/pdf", buffer: M.PDF_BOESE },
    { name: "<b>fett</b>.png", mimeType: "image/png", buffer: M.png() },
  ]);
  await page.waitForFunction(() => { const l = [...document.querySelectorAll("#anhang-liste > li")]; return l.length === 5 && l.every((x) => x.dataset.befunde != null); }, null, { timeout: 15000 }).catch(() => {});
  const zeilen = await page.evaluate(() => [...document.querySelectorAll("#anhang-liste > li")].map((li) => ({
    name: li.querySelector(".anhang-name").textContent, fett: !!li.querySelector(".anhang-name b"), art: li.dataset.art,
    k: [...li.querySelectorAll("[data-kennung]")].map((x) => x.dataset.kennung), angaben: +li.dataset.angaben,
    text: li.textContent, sicher: !!li.querySelector("[data-sicher]"), sicht: li.checkVisibility() })));
  const z = (n) => zeilen.find((x) => x.name === n) || { k: [], text: "" };
  ok("Anhänge: alle fünf stehen da und sind geprüft", zeilen.length === 5 && zeilen.every((x) => x.sicht && x.art), JSON.stringify(zeilen.map((x) => [x.name, x.art])));
  ok("Anhänge: SVG — Skript, fremder Abruf und die Angaben im Text (Name aus der Liste, IBAN)",
    z("logo.svg").k.includes("SVG-SKRIPT") && z("logo.svg").k.includes("SVG-VERWEIS") && z("logo.svg").angaben === 2 && /NAME/.test(z("logo.svg").text) && /IBAN/.test(z("logo.svg").text), JSON.stringify(z("logo.svg")));
  ok("Anhänge: PNG — Metadaten und Anhängsel", z("foto.png").k.includes("BILD-METADATEN") && z("foto.png").k.includes("BILD-ANHAENGSEL"), JSON.stringify(z("foto.png").k));
  ok("Anhänge: Word — Makro, Verweis und Angaben im Text", ["OFFICE-MAKRO", "OFFICE-VERWEIS", "ANHANG-ANGABEN"].every((k) => z("brief.docx").k.includes(k)), JSON.stringify(z("brief.docx").k));
  ok("Anhänge: PDF — Aktion (der PDF-Prüfer wurde nachgeladen)", z("r.pdf").k.includes("PDF-AKTION"), JSON.stringify(z("r.pdf").k));
  ok("Anhänge: ein Name mit <b> steht als Text da, nicht als HTML", z("<b>fett</b>.png").name === "<b>fett</b>.png" && !z("<b>fett</b>.png").fett);
  ok("Anhänge: ein sauberes Bild sagt „nichts gefunden“", z("<b>fett</b>.png").k.join() === "OHNE", JSON.stringify(z("<b>fett</b>.png").k));
  ok("Anhänge: eine sichere Fassung gibt es für Bilder und SVG, nicht für Word und PDF",
    z("foto.png").sicher && z("logo.svg").sicher && !z("brief.docx").sicher && !z("r.pdf").sicher);

  /* sichere Fassung: heruntergeladen, neu geprüft — nichts mehr gefunden */
  for (const [name, art] of [["foto.png", "png"], ["logo.svg", "png"]]) {
    const li = page.locator("#anhang-liste > li", { has: page.locator(".anhang-name", { hasText: name }) });
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }).catch(() => null), li.locator("[data-sicher]").click()]);
    let neu = null;
    if (dl) { const pfad = await dl.path(); neu = pfad ? readFileSync(pfad) : null; }
    const r = neu ? await page.evaluate(async (b) => { const x = await window.PrueferAnhang.pruefe("x." + "png", Uint8Array.from(b)); return { art: x.art, k: x.befunde.map((y) => y.kennung) }; }, [...neu]) : null;
    ok("sichere Fassung von " + name + ": ein " + art.toUpperCase() + " ohne jeden Befund", !!r && r.art === art && r.k.length === 0, JSON.stringify(r));
    ok("… und die Meldung sagt, was entfernt ist", /entfernt ist: .*(BILD|SVG)/.test(await li.locator("[data-anhang-meldung]").textContent()));
  }
  ok("Anhänge: nichts ging nach draußen (auch nicht der fremde Abruf aus der SVG)", draussen.length === 0, JSON.stringify(draussen));

  /* nach dem Neuladen noch da (IndexedDB), und Entfernen nimmt genau einen weg */
  const id = await page.evaluate(() => window.eval("st.id"));
  await page.waitForTimeout(400);
  await page.reload(); await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  await page.evaluate((i) => window.eval("st.ordner='entwurf';oeffne")(i), id);
  await page.waitForFunction(() => document.querySelectorAll("#anhang-liste > li[data-befunde]").length === 5, null, { timeout: 10000 }).catch(() => {});
  ok("Anhänge: nach dem Neuladen hängen alle fünf noch an der Mail", (await page.locator("#anhang-liste > li").count()) === 5);
  await page.locator("#anhang-liste > li", { has: page.locator(".anhang-name", { hasText: "r.pdf" }) }).locator("[data-weg]").click();
  const rest = await page.evaluate(() => [...document.querySelectorAll(".anhang-name")].map((x) => x.textContent));
  ok("Anhänge: „Entfernen“ nimmt genau diesen einen weg", rest.length === 4 && !rest.includes("r.pdf"), JSON.stringify(rest));

  /* .eml mit Anhang: die Datei kommt mit an die neue Mail */
  const docx = M.docxBoese().toString("base64").replace(/.{76}/g, "$&\r\n");
  const eml = ["From: Petra Beispiel <petra@musterbau.example>", "To: buero@beispiel.example", "Subject: Unterlagen",
    "MIME-Version: 1.0", 'Content-Type: multipart/mixed; boundary="GRENZE"', "", "--GRENZE", "Content-Type: text/plain; charset=utf-8", "",
    "Anbei der Vertrag.", "--GRENZE", 'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="=?UTF-8?B?VmVydHJhZyDDpC5kb2N4?="',
    "Content-Transfer-Encoding: base64", 'Content-Disposition: attachment; filename="=?UTF-8?B?VmVydHJhZyDDpC5kb2N4?="', "", docx, "--GRENZE--", ""].join("\r\n");
  await page.click("#einfuegen");
  await page.setInputFiles("#einfuegen-datei", { name: "mail.eml", mimeType: "message/rfc822", buffer: Buffer.from(eml) });
  await page.waitForFunction(() => { const l = document.querySelector("#anhang-liste > li[data-befunde]"); return !!l && document.querySelector(".betreff") && /Unterlagen/.test(document.querySelector(".betreff").textContent); }, null, { timeout: 10000 }).catch(() => {});
  const ein = await page.evaluate(() => ({ betreff: (document.querySelector(".betreff") || {}).textContent, text: (document.querySelector(".blatt") || {}).textContent,
    anh: [...document.querySelectorAll("#anhang-liste > li")].map((li) => ({ name: li.querySelector(".anhang-name").textContent, k: [...li.querySelectorAll("[data-kennung]")].map((x) => x.dataset.kennung) })) }));
  ok(".eml mit Anhang: der Mailtext kommt an wie vorher", /Anbei der Vertrag/.test(ein.text || ""), JSON.stringify(ein));
  ok(".eml mit Anhang: die Datei hängt an der neuen Mail, mit kodiertem Namen richtig gelesen", ein.anh.length === 1 && ein.anh[0].name === "Vertrag ä.docx", JSON.stringify(ein.anh));
  ok(".eml mit Anhang: … und ist geprüft (Makro, Angaben)", !!ein.anh[0] && ein.anh[0].k.includes("OFFICE-MAKRO") && ein.anh[0].k.includes("ANHANG-ANGABEN"), JSON.stringify(ein.anh));
  await ctx.close();
}

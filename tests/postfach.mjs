/*
 * postfach.mjs — Auswahl, Verschieben, Papierkorb, eigene Ordner
 * (assets/postfach.js, Klaus 2026-10-02), aufgerufen aus smoke.mjs.
 * Alle Mails sind die erfundenen Beispiele der Seite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function ohneBrowser(ok, WURZEL) {
  const js = readFileSync(join(WURZEL, "assets/postfach.js"), "utf8");
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), abl = readFileSync(join(WURZEL, "assets/ablehnung.js"), "utf8");
  ok("Postfach: assets/postfach.js steht im Offline-Vorrat", sw.includes('"assets/postfach.js"'));
  ok("Postfach: … und wird von assets/ablehnung.js nachgeladen", /src = "assets\/postfach\.js"/.test(abl));
  ok("Postfach: der Speicher-Schlüssel für eigene Ordner ist app-eigen", /"sendepruefer_ablagen"/.test(js));
  ok("Postfach: kein innerHTML — Ordner- und Mailnamen sind Text", !/innerHTML/.test(js));
  ok("Postfach: die ART einer Mail (m.ordner) wird nie umgeschrieben", !/m\.ordner\s*=[^=]/.test(js));
}

async function lang(page, sel) {
  const r = await page.locator(sel).boundingBox();
  await page.mouse.move(r.x + 40, r.y + r.height / 2); await page.mouse.down();
  await page.waitForTimeout(650); await page.mouse.up();
}
const mails = (page) => page.evaluate(() => window.SendePruefer.mails().map((m) => ({ id: m.id, ordner: m.ordner, ablage: m.ablage || "", aus: m.geloeschtAus })));
const zahl = (page, id) => page.evaluate((id) => { const b = document.querySelector('#ordnerliste [data-ordner="' + id + '"] .zahl'); return b ? +b.textContent : -1; }, id);

export async function imBrowser(ok, browser, BASIS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const fragen = [];
  page.on("dialog", (d) => { fragen.push(d.type() + ":" + d.message()); d.type() === "prompt" ? d.accept(globalThis.__antwort || "") : d.accept(); });
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPPostfach && window.SPPostfach.eingebaut, null, { timeout: 15000 });

  const leiste = await page.evaluate(() => [...document.querySelectorAll("#ordnerliste [data-ordner], #ordnerliste #ordner-neu")].map((b) => b.dataset.ordner || b.id));
  ok("Postfach: links stehen Archiv, Papierkorb und „＋ Neuer Ordner“", leiste.includes("archiv") && leiste.includes("papierkorb") && leiste.includes("ordner-neu"), leiste.join(","));
  const ein0 = await zahl(page, "eingang");
  ok("Postfach: Eingefügt zeigt die Beispiel-Mails (sonst misst der Rest nichts)", ein0 >= 2, String(ein0));

  /* ein kurzer Klick öffnet weiter */
  await page.click("#liste .zeile >> nth=0");
  ok("Postfach: ein kurzer Klick öffnet die Mail wie bisher", await page.evaluate(() => document.getElementById("app").dataset.ansicht === "lesen"));
  await page.evaluate(() => { document.getElementById("app").dataset.ansicht = "liste"; });
  await page.click('#ordnerliste [data-ordner="eingang"]');

  /* langer Druck → Auswahl */
  await lang(page, "#liste .zeile >> nth=0");
  const nachDruck = await page.evaluate(() => ({ leiste: !!document.getElementById("wahlleiste"), n: document.querySelectorAll("#liste .zeile[data-gewaehlt]").length,
    ansicht: document.getElementById("app").dataset.ansicht }));
  ok("Postfach: ein langer Druck wählt die Mail aus und zeigt die Auswahl-Leiste", nachDruck.leiste && nachDruck.n === 1, JSON.stringify(nachDruck));
  ok("Postfach: … und öffnet sie dabei NICHT", nachDruck.ansicht === "liste", nachDruck.ansicht);
  await page.click("#liste .zeile >> nth=1");
  ok("Postfach: in der Auswahl wählt ein Tipp eine weitere Mail dazu", await page.evaluate(() => document.querySelectorAll("#liste .zeile[data-gewaehlt]").length) === 2);
  await page.click("#liste .zeile >> nth=1");   // wieder abwählen, sonst sind schon alle gewählt
  await page.click("#wahl-alle");
  ok("Postfach: „Alle“ wählt alle Mails des Ordners", await page.evaluate(() => document.querySelectorAll("#liste .zeile:not([data-gewaehlt])").length) === 0);
  await page.click("#wahl-alle");
  ok("Postfach: … ein zweites Mal wieder keine", await page.evaluate(() => document.querySelectorAll("#liste .zeile[data-gewaehlt]").length) === 0);

  /* zwei Mails ins Archiv */
  await page.click("#liste .zeile >> nth=0"); await page.click("#liste .zeile >> nth=1");
  const gew = await page.evaluate(() => [...document.querySelectorAll("#liste .zeile[data-gewaehlt]")].map((z) => +z.dataset.id || z.dataset.id));
  await page.click("#wahl-verschieben"); await page.waitForSelector("#ziel-dialog[open]");
  await page.click('#ziel-dialog [data-ziel="archiv"]');
  let ms = await mails(page);
  const imArchiv = ms.filter((m) => m.ablage === "archiv");
  ok("Postfach: „Verschieben → Archiv“ legt genau die gewählten Mails ins Archiv", imArchiv.length === 2 && imArchiv.every((m) => gew.map(String).includes(String(m.id))), JSON.stringify(ms));
  ok("Postfach: … ihre Art bleibt „eingang“ (sie werden nicht zu Entwürfen)", imArchiv.every((m) => m.ordner === "eingang"));
  ok("Postfach: … Eingefügt zählt zwei weniger, Archiv zwei", await zahl(page, "eingang") === ein0 - 2 && await zahl(page, "archiv") === 2);
  ok("Postfach: … und die Auswahl ist danach beendet", await page.evaluate(() => !document.getElementById("wahlleiste")));

  /* nach dem Neuladen noch dort */
  await page.reload();
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPPostfach);
  ok("Postfach: nach dem Neuladen liegen die zwei weiter im Archiv", (await mails(page)).filter((m) => m.ablage === "archiv").length === 2);

  /* Archiv → Papierkorb → Rückgängig */
  await page.click('#ordnerliste [data-ordner="archiv"]');
  await page.click("#auswahl-start"); await page.click("#wahl-alle"); await page.click("#wahl-loeschen");
  ms = await mails(page);
  ok("Postfach: „Löschen“ legt in den Papierkorb, nicht weg", ms.filter((m) => m.ablage === "papierkorb").length === 2 && ms.filter((m) => m.ablage === "papierkorb").every((m) => m.aus === "archiv"), JSON.stringify(ms));
  ok("Postfach: … ohne eine Frage (der Weg zurück steht ja da)", !fragen.some((f) => f.startsWith("confirm")), fragen.join("|"));
  ok("Postfach: … und unten steht „Rückgängig“", await page.isVisible("#pf-toast-knopf"));
  await page.click("#pf-toast-knopf");
  ok("Postfach: „Rückgängig“ holt sie an ihren Ort zurück (Archiv)", (await mails(page)).filter((m) => m.ablage === "archiv").length === 2);

  /* Papierkorb: zurückholen und endgültig */
  await page.click("#auswahl-start"); await page.click("#wahl-alle"); await page.click("#wahl-loeschen");
  await page.click('#ordnerliste [data-ordner="papierkorb"]');
  ok("Postfach: im Papierkorb stehen die zwei", await page.locator("#liste .zeile").count() === 2);
  await lang(page, "#liste .zeile >> nth=0");
  ok("Postfach: im Papierkorb heißt es „Zurückholen“ und „Endgültig löschen“", await page.isVisible("#wahl-zurueck") && await page.isVisible("#wahl-endgueltig") && !(await page.isVisible("#wahl-verschieben")));
  await page.click("#wahl-zurueck");
  ok("Postfach: „Zurückholen“ legt die Mail zurück ins Archiv", (await mails(page)).filter((m) => m.ablage === "archiv").length === 1);
  const vorher = (await mails(page)).length;
  await lang(page, "#liste .zeile >> nth=0"); await page.click("#wahl-endgueltig");
  ok("Postfach: endgültig löschen fragt vorher, mit Zahl", fragen.some((f) => /^confirm:1 Mail\(s\) endgültig löschen/.test(f)), fragen.join("|"));
  ok("Postfach: … und dann ist die Mail weg", (await mails(page)).length === vorher - 1);
  await page.reload();
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPPostfach);
  ok("Postfach: … auch nach dem Neuladen", (await mails(page)).length === vorher - 1 && (await mails(page)).every((m) => m.ablage !== "papierkorb"));

  /* eigener Ordner: anlegen, Mail hinein, umbenennen, löschen → Mails zurück */
  globalThis.__antwort = "Kunden <b>A</b>";
  await page.click("#ordner-neu");
  const eigen = await page.evaluate(() => JSON.parse(localStorage.getItem("sendepruefer_ablagen")).find((o) => o.name.startsWith("Kunden")));
  ok("Postfach: „＋ Neuer Ordner“ legt einen eigenen Ordner an", !!eigen, JSON.stringify(eigen));
  ok("Postfach: … sein Name steht als Text da, nicht als HTML", await page.evaluate((id) => { const b = document.querySelector('#ordnerliste [data-ordner="' + id + '"]'); return !!b && !b.querySelector("b") && /<b>A<\/b>/.test(b.textContent); }, eigen && eigen.id));
  await page.click('#ordnerliste [data-ordner="archiv"]');
  await lang(page, "#liste .zeile >> nth=0"); await page.click("#wahl-verschieben");
  await page.click('#ziel-dialog [data-ziel="' + (eigen && eigen.id) + '"]');
  ok("Postfach: eine Mail lässt sich in den eigenen Ordner verschieben", (await mails(page)).filter((m) => m.ablage === (eigen && eigen.id)).length === 1);
  await page.click('#ordnerliste [data-ordner="' + (eigen && eigen.id) + '"]');
  globalThis.__antwort = "Kunden 2026";
  await page.click("#ordner-umbenennen");
  ok("Postfach: ✎ Umbenennen ändert den Namen", await page.evaluate((id) => JSON.parse(localStorage.getItem("sendepruefer_ablagen")).find((o) => o.id === id).name === "Kunden 2026", eigen && eigen.id));
  await page.click("#ordner-loeschen");
  ms = await mails(page);
  ok("Postfach: einen Ordner zu löschen löscht keine Mail — sie geht zurück in ihren Ursprungsordner", ms.length === vorher - 1 && !ms.some((m) => m.ablage === (eigen && eigen.id)));
  ok("Postfach: … und der Ordner steht nicht mehr links", await page.evaluate((id) => !document.querySelector('#ordnerliste [data-ordner="' + id + '"]'), eigen && eigen.id));

  /* Handy: unten ein fünfter Knopf „Mehr“ */
  await page.setViewportSize({ width: 380, height: 800 });
  const unten = await page.evaluate(() => [...document.querySelectorAll("#bottomnav button")].map((b) => { const r = b.getBoundingClientRect(); return { o: b.dataset.ordner, w: r.width, sicht: b.checkVisibility() }; }));
  ok("Postfach: am Handy stehen unten fünf Knöpfe, der fünfte heißt „Mehr“", unten.length === 5 && unten[4].o === "mehr" && unten.every((u) => u.sicht && u.w > 40), JSON.stringify(unten));
  await page.click("#ordner-mehr"); await page.waitForSelector("#ziel-dialog[open]");
  await page.click('#ziel-dialog [data-ziel="archiv"]');
  ok("Postfach: „Mehr“ führt zum Archiv", await page.evaluate(() => document.querySelector("#liste h2").textContent === "Archiv"));
  await ctx.close();
}

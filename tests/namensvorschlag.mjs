/*
 * namensvorschlag.mjs — Namensvorschläge aus Modul 25 (assets/namensvorschlag.js,
 * Klaus 2026-10-02, Grenzen-Liste 4c), aufgerufen aus smoke.mjs.
 * Ein Vorschlag verdeckt NICHTS — erst ein Tipp trägt ihn in „Weitere Namen“ ein.
 * Alle Namen und Adressen sind erfunden.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function ohneBrowser(ok, WURZEL) {
  const js = readFileSync(join(WURZEL, "assets/namensvorschlag.js"), "utf8");
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), abl = readFileSync(join(WURZEL, "assets/ablehnung.js"), "utf8");
  ok("Vorschlag: assets/namensvorschlag.js steht im Offline-Vorrat", sw.includes('"assets/namensvorschlag.js"'));
  ok("Vorschlag: … und wird von assets/ablehnung.js nachgeladen", /src = "assets\/namensvorschlag\.js"/.test(abl));
  ok("Vorschlag: kein innerHTML — Namen aus fremden Mails sind Text", !/innerHTML/.test(js));
}

const MAIL = [
  "From: Petra Beispiel <petra@musterbau.example>",
  "To: Anna Erste <anna@beispiel.example>",
  "Subject: Rückruf",
  "",
  "Hallo Anna,",
  "bitte richten Sie Herrn Kowalski Bescheid aus, dass Frau Dr. Lindqvist morgen kommt.",
  "",
  "Viele Grüße",
  "Petra Beispiel",
].join("\n");

export async function imBrowser(ok, browser, BASIS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPNamensvorschlag && window.SPNamensvorschlag.eingebaut, null, { timeout: 15000 });

  const vor = await page.evaluate((roh) => {
    einfuegen(roh);
    const m = MAILS[MAILS.length - 1];
    const knoepfe = [...document.querySelectorAll("#namen-vorschlag button[data-vorschlag]")];
    return { namen: knoepfe.map((k) => k.dataset.vorschlag), sichtbar: knoepfe.length > 0 && knoepfe[0].getClientRects().length > 0,
      text: pruefung(m).text, extra: m.namenExtra || "" };
  }, MAIL);
  ok("Vorschlag: Namen nach Herr/Frau werden vorgeschlagen", vor.namen.includes("Kowalski") && vor.namen.includes("Lindqvist"), JSON.stringify(vor.namen));
  ok("Vorschlag: … und sind als Knöpfe zu sehen", vor.sichtbar);
  ok("Vorschlag: ein schon bekannter Name (Von) wird nicht noch einmal vorgeschlagen", !vor.namen.includes("Petra Beispiel"), JSON.stringify(vor.namen));
  /* „Anna Erste“ ist bekannt, verdeckt aber nur die ganze Zeichenkette — „Hallo Anna,“ ginge hinaus. */
  ok("Vorschlag: der Vorname aus der Begrüßung kommt trotzdem, weil nur „Anna Erste“ verdeckt wird", vor.namen.includes("Anna") && vor.text.includes("Hallo Anna"), JSON.stringify(vor.namen));
  ok("Vorschlag: ein Vorschlag verdeckt NICHTS — beide Namen gehen ohne Tipp hinaus", vor.text.includes("Kowalski") && vor.text.includes("Lindqvist") && vor.extra === "", vor.text);

  await page.click('#namen-vorschlag button[data-vorschlag="Kowalski"]');
  const nach = await page.evaluate(() => {
    const m = MAILS[MAILS.length - 1];
    return { text: pruefung(m).text, extra: m.namenExtra, feld: document.getElementById("namen").value,
      namen: [...document.querySelectorAll("#namen-vorschlag button[data-vorschlag]")].map((k) => k.dataset.vorschlag) };
  });
  ok("Vorschlag: ein Tipp trägt den Namen in „Weitere Namen“ ein", nach.extra === "Kowalski" && nach.feld === "Kowalski", JSON.stringify(nach));
  ok("Vorschlag: … dann ist er verdeckt, der andere nicht", !nach.text.includes("Kowalski") && nach.text.includes("Lindqvist"), nach.text);
  ok("Vorschlag: … und steht nicht mehr unter den Vorschlägen", !nach.namen.includes("Kowalski") && nach.namen.includes("Lindqvist"), JSON.stringify(nach.namen));

  const leer = await page.evaluate(() => {
    einfuegen("From: A Muster <a@x.example>\nTo: B Muster <b@x.example>\nSubject: x\n\nDas Angebot liegt bei.");
    const b = document.getElementById("namen-vorschlag"); return { hidden: !b || b.hidden, n: b ? b.dataset.anzahl : "-" };
  });
  ok("Vorschlag: ohne Anrede steht keine Vorschlagszeile da", leer.hidden && leer.n === "0", JSON.stringify(leer));
  await ctx.close();
}

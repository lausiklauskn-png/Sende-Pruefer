/*
 * empfaenger.mjs — alle Empfänger und Cc als Namen verdecken (assets/empfaenger.js,
 * Klaus 2026-10-02), aufgerufen aus smoke.mjs. Alle Namen und Adressen sind erfunden.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function ohneBrowser(ok, WURZEL) {
  const js = readFileSync(join(WURZEL, "assets/empfaenger.js"), "utf8");
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), abl = readFileSync(join(WURZEL, "assets/ablehnung.js"), "utf8");
  ok("Empfänger: assets/empfaenger.js steht im Offline-Vorrat", sw.includes('"assets/empfaenger.js"'));
  ok("Empfänger: … und wird von assets/ablehnung.js nachgeladen", /src = "assets\/empfaenger\.js"/.test(abl));
  ok("Empfänger: kein innerHTML — Namen aus fremden Kopfzeilen sind Text", !/innerHTML/.test(js));
}

const EML = [
  "From: Petra Beispiel <petra@musterbau.example>",
  'To: Anna Erste <anna@beispiel.example>, "Zweiter, Bernd" <bernd@beispiel.example>; carla@beispiel.example',
  "Cc: =?UTF-8?Q?J=C3=BCrgen_Kopie?= <juergen@beispiel.example>, Dora Drittel <dora@beispiel.example>",
  "Subject: Angebot",
  "",
  "Hallo Anna, hallo Zweiter, Bernd, hallo Jürgen Kopie und Dora Drittel,",
  "anbei das Angebot. Gruß Petra Beispiel",
].join("\n");

const GEPASTET = [
  "Von: Petra Beispiel <petra@musterbau.example>",
  "An: Anna Erste <anna@beispiel.example>, Bernd Zweiter <bernd@beispiel.example>",
  "Cc: Dora Drittel <dora@beispiel.example>",
  "Betreff: Termin",
  "",
  "Liebe Anna Erste, lieber Bernd Zweiter, liebe Dora Drittel, bis morgen.",
].join("\n");

export async function imBrowser(ok, browser, BASIS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPEmpfaenger && window.SPEmpfaenger.eingebaut, null, { timeout: 15000 });

  for (const [art, roh, namen] of [
    [".eml", EML, ["Zweiter, Bernd", "Jürgen Kopie", "Dora Drittel"]],
    ["gepastet", GEPASTET, ["Bernd Zweiter", "Dora Drittel"]],
  ]) {
    const r = await page.evaluate((roh) => {
      einfuegen(roh);
      const m = MAILS[MAILS.length - 1];
      return { an: m.anName, weitere: m.weitereNamen || [], namen: mailNamen(m), text: pruefung(m).text,
        auto: (document.getElementById("namen-auto") || {}).textContent || "" };
    }, roh);
    ok(`Empfänger (${art}): der erste Empfänger bleibt „Anna Erste“`, r.an === "Anna Erste", r.an);
    ok(`Empfänger (${art}): weitere Empfänger und Cc stehen in m.weitereNamen`, namen.every((n) => r.weitere.includes(n)), JSON.stringify(r.weitere));
    ok(`Empfänger (${art}): mailNamen nimmt sie mit`, namen.every((n) => r.namen.includes(n)), JSON.stringify(r.namen));
    ok(`Empfänger (${art}): im Text, der hinausgeht, steht keiner dieser Namen mehr`, namen.every((n) => !r.text.includes(n)), r.text);
    ok(`Empfänger (${art}): die Zeile „Aus Von/An/Cc“ nennt sie`, /Aus Von\/An\/Cc:/.test(r.auto) && namen.every((n) => r.auto.includes(n)), r.auto);
  }
  /* Gegenrichtung: eine Mail mit nur EINEM Empfänger bekommt nichts dazu. */
  const eins = await page.evaluate(() => {
    einfuegen("From: A Muster <a@x.example>\nTo: B Muster <b@x.example>\nSubject: x\n\nHallo");
    const m = MAILS[MAILS.length - 1]; return { w: m.weitereNamen, auto: document.getElementById("namen-auto").textContent };
  });
  ok("Empfänger: ein einziger Empfänger ergibt keine weiteren Namen", !eins.w && /^Aus Von\/An: /.test(eins.auto), JSON.stringify(eins));
  /* nach dem Neuladen (IndexedDB) bleibt es so */
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPEmpfaenger, null, { timeout: 15000 });
  ok("Empfänger: m.weitereNamen überlebt das Neuladen",
    await page.evaluate(() => MAILS.some((m) => Array.isArray(m.weitereNamen) && m.weitereNamen.includes("Dora Drittel"))));
  await ctx.close();
}

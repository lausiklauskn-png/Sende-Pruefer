/*
 * sicherung.mjs — verschlüsselte Sicherung des Postfachs (assets/sicherung.js,
 * Klaus 2026-10-02), aufgerufen aus smoke.mjs. Alle Mails sind erfunden.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function ohneBrowser(ok, WURZEL) {
  const js = readFileSync(join(WURZEL, "assets/sicherung.js"), "utf8");
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), abl = readFileSync(join(WURZEL, "assets/ablehnung.js"), "utf8");
  ok("Sicherung: assets/sicherung.js steht im Offline-Vorrat", sw.includes('"assets/sicherung.js"'));
  ok("Sicherung: … und wird von assets/ablehnung.js nachgeladen", /src = "assets\/sicherung\.js"/.test(abl));
  ok("Sicherung: kein innerHTML — Namen aus der Datei sind Text", !/innerHTML/.test(js));
  ok("Sicherung: die KI-Schlüssel kommen NICHT mit", !/sendepruefer_tresor|sendepruefer_key/.test(js.replace(/\/\*[\s\S]*?\*\//g, "")));
  ok("Sicherung: das Passwort wird nicht abgelegt", !/(setItem|schreib)\([^)]*pw/.test(js));
}

async function bereit(page) {
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPSicherung && window.SPSicherung.eingebaut, null, { timeout: 15000 });
}
const eigeneMail = (page, id) => page.evaluate((id) => {
  const m = { id, ordner: "eingang", zeit: new Date().toISOString(), von: "Erika Muster <erika@beispiel.example>", an: "", betreff: "Test " + id,
    text: "Hallo, das ist eine erfundene Mail.", anhaenge: [{ id: "a1", name: "notiz.txt", typ: "text/plain", groesse: 5, blob: new Blob(["Hallo"], { type: "text/plain" }) }] };
  MAILS.push(m); jetztSpeichern(m); alles();
}, id);

export async function imBrowser(ok, browser, BASIS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  page.on("dialog", (d) => d.accept());
  await page.goto(BASIS + "sende-pruefer.html");
  await bereit(page);

  ok("Sicherung: der Kasten steht im Menü", await page.evaluate(() => !!document.querySelector("#menue-dialog #sicherung-kasten")));
  ok("Sicherung: nur Beispiel-Mails → keine Erinnerung", await page.evaluate(() => !document.querySelector("[data-sicherung-erinnerung]")));
  await eigeneMail(page, "eigen-1");
  await page.evaluate(() => window.SPSicherung.erinnerung());
  const er = await page.evaluate(() => { const e = document.querySelector("[data-sicherung-erinnerung]"); return e ? e.dataset.sicherungErinnerung : ""; });
  ok("Sicherung: eine eigene Mail, nie gesichert → Erinnerung „nie“", er === "nie", er);
  ok("Sicherung: die Erinnerung steht über der Liste", await page.evaluate(() => { const e = document.querySelector("[data-sicherung-erinnerung]"), l = document.getElementById("liste"); return !!(e && l && (e.compareDocumentPosition(l) & 4)); }));

  /* Passwort-Regeln */
  await page.evaluate(() => document.getElementById("menue-dialog").showModal());
  await page.fill("#sicherung-pw", "kurz"); await page.fill("#sicherung-pw2", "kurz"); await page.click("#sicherung-machen");
  ok("Sicherung: ein zu kurzes Passwort wird abgewiesen", /mindestens/.test(await page.textContent("#sicherung-meldung")));
  await page.fill("#sicherung-pw", "geheim-1234"); await page.fill("#sicherung-pw2", "geheim-9999"); await page.click("#sicherung-machen");
  ok("Sicherung: zwei verschiedene Passwörter werden abgewiesen", /nicht gleich/.test(await page.textContent("#sicherung-meldung")));

  /* Sicherung erstellen */
  const dl = page.waitForEvent("download", { timeout: 30000 });
  await page.fill("#sicherung-pw", "geheim-1234"); await page.fill("#sicherung-pw2", "geheim-1234"); await page.click("#sicherung-machen");
  const d = await dl;
  ok("Sicherung: der Dateiname nennt App und Datum", /^Sende-Pruefer-Sicherung-\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename()), d.suggestedFilename());
  await page.waitForFunction(() => /✓/.test(document.getElementById("sicherung-meldung").textContent), null, { timeout: 30000 });
  const datei = await page.evaluate(() => window.SPSicherung.letzteDatei.inhalt);
  const roh = JSON.stringify(datei);
  ok("Sicherung: die Datei trägt Art und Paket", datei.art === "sendepruefer-sicherung" && datei.paket && datei.paket.ct);
  ok("Sicherung: in der Datei steht KEIN Klartext (Betreff, Absender, Mailtext)", !/Test eigen-1|erika@beispiel|erfundene Mail|notiz\.txt/.test(roh));
  ok("Sicherung: die Felder sind nach dem Sichern geleert", await page.evaluate(() => !document.getElementById("sicherung-pw").value && !document.getElementById("sicherung-pw2").value));
  ok("Sicherung: „letzte Sicherung“ steht da und die Erinnerung ist weg",
    await page.evaluate(() => /Letzte Sicherung/.test(document.getElementById("sicherung-stand").textContent) && !document.querySelector("[data-sicherung-erinnerung]")));

  /* falsches Passwort */
  const falsch = await page.evaluate((d) => window.SPSicherung.oeffnen("falsch-falsch", d).then(() => "auf", (e) => e.message), datei);
  ok("Sicherung: ein falsches Passwort heißt „passwort“", falsch === "passwort", falsch);
  const fass = await page.evaluate((d) => window.SPSicherung.oeffnen("geheim-1234", Object.assign({}, d, { paket: Object.assign({}, d.paket, { v: 99 }) })).then(() => "auf", (e) => e.message), datei);
  ok("Sicherung: eine fremde Fassung heißt „fassung“, nicht Passwort", fass === "fassung", fass);

  /* Postfach leeren, dann zurückholen über die Oberfläche */
  await page.evaluate(() => dbTx("readwrite", (s) => s.clear()).then(() => { MAILS.length = 0; alles(); }));
  await page.setInputFiles("#sicherung-datei", { name: d.suggestedFilename(), mimeType: "application/json", buffer: Buffer.from(roh) });
  await page.waitForTimeout(200);
  await page.fill("#sicherung-pw-zurueck", "falsch-falsch"); await page.click("#sicherung-holen");
  await page.waitForFunction(() => /passt nicht|ließ sich nicht/.test(document.getElementById("sicherung-zurueck-meldung").textContent), null, { timeout: 30000 });
  ok("Sicherung: Zurückholen mit falschem Passwort sagt es und holt nichts", await page.evaluate(() => MAILS.length === 0));
  await page.fill("#sicherung-pw-zurueck", "geheim-1234"); await page.click("#sicherung-holen");
  await page.waitForFunction(() => /✓/.test(document.getElementById("sicherung-zurueck-meldung").textContent), null, { timeout: 30000 });
  const zur = await page.evaluate(() => { const m = MAILS.find((x) => x.id === "eigen-1"); return m ? { n: MAILS.length, an: m.anhaenge && m.anhaenge[0], blob: m.anhaenge && m.anhaenge[0].blob instanceof Blob } : null; });
  ok("Sicherung: die eigene Mail ist zurück", !!zur, JSON.stringify(zur));
  ok("Sicherung: … samt Anhang als Datei", !!(zur && zur.blob && zur.an.name === "notiz.txt"));
  const txt = await page.evaluate(() => MAILS.find((x) => x.id === "eigen-1").anhaenge[0].blob.text());
  ok("Sicherung: … und der Anhang trägt seinen Inhalt", txt === "Hallo", txt);
  const melde = await page.textContent("#sicherung-zurueck-meldung");
  ok("Sicherung: die Meldung nennt, wie viele dazukamen", /\d+ Mail\(s\) dazu/.test(melde), melde);

  /* ein zweites Zurückholen überschreibt nichts */
  await page.evaluate(() => { MAILS.find((x) => x.id === "eigen-1").betreff = "geändert"; });
  await page.evaluate(() => { document.getElementById("sicherung-zurueck-meldung").textContent = ""; });
  await page.fill("#sicherung-pw-zurueck", "geheim-1234"); await page.click("#sicherung-holen");
  await page.waitForFunction(() => /✓|passt nicht|ließ sich nicht/.test(document.getElementById("sicherung-zurueck-meldung").textContent), null, { timeout: 30000 });
  ok("Sicherung: ein zweites Zurückholen fügt nichts doppelt hinzu und überschreibt nichts",
    await page.evaluate(() => MAILS.filter((x) => x.id === "eigen-1").length === 1 && MAILS.find((x) => x.id === "eigen-1").betreff === "geändert"));

  /* nach dem Neuladen ist sie noch da (in der IndexedDB gespeichert) */
  await page.goto(BASIS + "sende-pruefer.html"); await bereit(page);
  ok("Sicherung: die zurückgeholte Mail überlebt das Neuladen", await page.evaluate(() => MAILS.some((x) => x.id === "eigen-1")));
  ok("Sicherung: der Stand des dauerhaften Speichers wird genannt", await page.evaluate(() => { const e = document.querySelector("[data-dauer]"); return !!(e && e.textContent.length > 10 && ["ja", "nein", "unbekannt"].includes(e.dataset.dauer)); }));
  await ctx.close();
}

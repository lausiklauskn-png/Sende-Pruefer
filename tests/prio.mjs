/*
 * prio.mjs — Prioritätenliste im Sende-Prüfer (assets/prioritaeten.js + assets/prio.js,
 * Klaus 2026-10-05), aufgerufen aus smoke.mjs. Alle Texte sind erfunden.
 * Eingang: eigener Kasten [data-prio-treffer]. Ausgang: „streng“ hält Kopieren,
 * .eml und Teilen einmal an, ein zweiter Tipp geht weiter. Nie „harmlos“:
 * jeder Treffer sagt, wie er gefunden wurde, und gibt eine Empfehlung.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export const PRIO_SHA = "c5afe1747210ad837b3f7868d00d1f44a91ad53ca1e998f86f0870ed07fe83b0";
const SCHL = "sendepruefer_prioritaeten_v1";

export async function ohneBrowser(ok, WURZEL) {
  const kern = readFileSync(join(WURZEL, "assets/prioritaeten.js"));
  /* Gemessen wird der Code, nicht der Erklär-Kommentar (der nennt „innerHTML“ und „harmlos“ als Verbot). */
  const js = readFileSync(join(WURZEL, "assets/prio.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const sw = readFileSync(join(WURZEL, "sw.js"), "utf8"), abl = readFileSync(join(WURZEL, "assets/ablehnung.js"), "utf8");
  ok("Prio: assets/prioritaeten.js ist byte-1:1 aus Mein-In-and-Out-Book (SHA-Pin)", createHash("sha256").update(kern).digest("hex") === PRIO_SHA);
  ok("Prio: beide Dateien stehen im Offline-Vorrat", sw.includes('"assets/prioritaeten.js"') && sw.includes('"assets/prio.js"'));
  const a = abl.search(/src = "assets\/prioritaeten\.js"/), b = abl.search(/src = "assets\/prio\.js"/);
  ok("Prio: ablehnung.js lädt erst den Kern, dann den Klebstoff", a >= 0 && b > a, a + " / " + b);
  ok("Prio: eigener Speicher-Schlüssel " + SCHL, js.includes('"' + SCHL + '"'));
  ok("Prio: der Schlüssel des In-and-Out-Books wird nicht benutzt", !/inandout|in_and_out|inoutbook/i.test(js));
  ok("Prio: kein innerHTML im Klebstoff", !/innerHTML/.test(js));
  ok("Prio: das Wort „harmlos“ steht nirgends im Klebstoff", !/harmlos/i.test(js));
}

const EINGANG = [
  "From: Petra Beispiel <petra@musterbau.example>",
  "To: Anna Erste <anna@beispiel.example>",
  "Subject: Zugang",
  "",
  "Hallo Anna,",
  "anbei das Passwort für das Portal.",
  "",
  "Viele Grüße",
  "Petra",
].join("\n");

async function seite(browser, BASIS, sperreKern) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (sperreKern) await page.route(/assets\/prioritaeten\.js/, (r) => r.abort());
  await page.goto(BASIS + "sende-pruefer.html");
  await page.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true && window.SPPrio && window.SPPrio.eingebaut, null, { timeout: 15000 });
  return { ctx, page };
}

export async function imBrowser(ok, browser, BASIS) {
  let { ctx, page } = await seite(browser, BASIS, false);

  /* Eingang */
  const ein = await page.evaluate((roh) => {
    einfuegen(roh);
    const k = document.querySelector("[data-prio-treffer]");
    const li = k ? [...k.querySelectorAll("li[data-prio-gruppe]")] : [];
    const z = li.find((x) => x.dataset.prioGruppe === "zugang");
    return { da: !!k, richtung: k && k.dataset.richtung, n: k && k.dataset.prioTreffer, sichtbar: !!k && k.getClientRects().length > 0,
      hinterFunde: !!k && k.previousElementSibling && k.previousElementSibling.id === "funde",
      zugang: z ? { stufe: z.dataset.prioStufe, wort: z.querySelector("[data-prio-wort]").textContent, satz: z.querySelector("[data-prio-satz]").textContent,
        empf: z.querySelector("[data-prio-empf]").textContent, stelle: z.querySelector("[data-prio-stelle]").textContent } : null,
      haltHinweis: !!k && /hält die Seite einmal an/.test(k.textContent), harmlos: !!k && /harmlos/i.test(k.textContent) };
  }, EINGANG);
  ok("Prio Eingang: der Kasten steht unter den Funden", ein.da && ein.sichtbar && ein.hinterFunde, JSON.stringify(ein));
  ok("Prio Eingang: als Eingang erkannt", ein.richtung === "eingang", ein.richtung);
  ok("Prio Eingang: „Passwort“ wird unter Zugangsdaten gefunden (streng)", ein.zugang && ein.zugang.wort === "Passwort" && ein.zugang.stufe === "streng", JSON.stringify(ein.zugang));
  ok("Prio Eingang: der Treffer sagt, wie er gefunden wurde", ein.zugang && /Gefunden über eine feste/.test(ein.zugang.satz), ein.zugang && ein.zugang.satz);
  ok("Prio Eingang: … und gibt eine Empfehlung", ein.zugang && /^Empfehlung: \S/.test(ein.zugang.empf), ein.zugang && ein.zugang.empf);
  ok("Prio Eingang: … mit Stelle (Mailtext, Zeile)", ein.zugang && /Mailtext, Zeile \d+/.test(ein.zugang.stelle), ein.zugang && ein.zugang.stelle);
  ok("Prio Eingang: kein Halt-Hinweis im Eingang, nie „harmlos“", !ein.haltHinweis && !ein.harmlos);

  /* Ausgang */
  await page.evaluate(() => { const m = (neueMail(), MAILS[MAILS.length - 1]); m.betreff = "Rechnung"; m.text = "Hier die Bankverbindung mit IBAN für die Zahlung."; jetztSpeichern(m); zeichneLesen(); });
  const aus = await page.evaluate(() => {
    const k = document.querySelector("[data-prio-treffer]");
    return { richtung: k && k.dataset.richtung, streng: k && k.dataset.prioStreng, hinweis: !!k && /hält die Seite einmal an/.test(k.textContent) };
  });
  ok("Prio Ausgang: als Ausgang erkannt, mit strengen Treffern", aus.richtung === "ausgang" && Number(aus.streng) > 0, JSON.stringify(aus));
  ok("Prio Ausgang: der Kasten sagt, dass vor dem Hinausgehen angehalten wird", aus.hinweis);

  await page.evaluate(() => { window.__letzteEml = null; });
  await page.click("#eml");
  const e1 = await page.evaluate(() => ({ eml: window.__letzteEml, m: document.getElementById("aktion-meldung").textContent, halt: document.getElementById("aktion-meldung").hasAttribute("data-prio-halt") }));
  ok("Prio Ausgang: .eml — der erste Tipp hält an", !e1.eml && e1.halt && /^Angehalten/.test(e1.m), JSON.stringify(e1));
  ok("Prio Ausgang: … nennt den Weg und eine Empfehlung", /Gefunden über eine feste Wortliste/.test(e1.m) && /Empfehlung: \S/.test(e1.m) && /Noch einmal tippen/.test(e1.m), e1.m);
  await page.click("#eml");
  const e2 = await page.evaluate(() => window.__letzteEml);
  ok("Prio Ausgang: .eml — der zweite Tipp geht weiter", !!(e2 && e2.name), JSON.stringify(e2));

  /* Teilen (neue Mail, damit der Schlüssel frisch ist) */
  await page.evaluate(() => {
    window.__geteilt = 0; navigator.share = async () => { window.__geteilt++; }; navigator.canShare = () => true;
    const m = (neueMail(), MAILS[MAILS.length - 1]); m.text = "Bitte die IBAN prüfen."; jetztSpeichern(m); zeichneLesen();
  });
  await page.click("#teilen");
  const t1 = await page.evaluate(() => window.__geteilt);
  await page.click("#teilen");
  const t2 = await page.evaluate(() => window.__geteilt);
  ok("Prio Ausgang: Teilen — erster Tipp hält an, zweiter teilt", t1 === 0 && t2 === 1, t1 + " / " + t2);

  /* Kopieren über bereit() */
  const k = await page.evaluate(() => {
    const m = MAILS[MAILS.length - 1], log = [];
    const r1 = bereit(m, (t) => log.push(t)), r2 = bereit(m, (t) => log.push(t));
    return { r1: !!r1, r2: !!r2, log };
  });
  ok("Prio Ausgang: KI-Weg (Kopieren/Senden) — erster Tipp hält an, zweiter geht", !k.r1 && k.r2 && /^Angehalten/.test(k.log[0] || ""), JSON.stringify(k));

  /* Anhang zählt mit */
  await page.evaluate(() => {
    const m = (neueMail(), MAILS[MAILS.length - 1]); m.text = "Siehe Anhang.";
    m.anhaenge = [{ id: "pa1", name: "notiz.txt", typ: "text/plain", groesse: 40, blob: new File(["Hier steht die Kontonummer.\n"], "notiz.txt", { type: "text/plain" }) }];
    jetztSpeichern(m); zeichneLesen();
  });
  await page.waitForFunction(() => { const k = document.querySelector("[data-prio-treffer]"); return k && !k.querySelector("[data-prio-offen]") && k.querySelector("li[data-prio-gruppe='bank']"); }, null, { timeout: 15000 }).catch(() => {});
  const an = await page.evaluate(() => { const li = document.querySelector("[data-prio-treffer] li[data-prio-gruppe='bank']"); return li ? li.querySelector("[data-prio-stelle]").textContent : null; });
  ok("Prio Anhang: der Text eines Anhangs zählt mit (Kontonummer im Anhang)", !!an && /Anhang/.test(an), an);

  /* Stufe „aus“ */
  const aus2 = await page.evaluate((S) => {
    const p = window.Prioritaeten, st = p.laden(S); st.stufen.bank = "aus"; p.speichern(S, st);
    zeichneLesen();
    return { bank: !!document.querySelector("[data-prio-treffer] li[data-prio-gruppe='bank']"), gespeichert: !!localStorage.getItem(S), fremd: Object.keys(localStorage).filter((x) => /prioritaeten/.test(x) && x !== S) };
  }, SCHL);
  ok("Prio: Stufe „aus“ nimmt die Gruppe heraus", !aus2.bank);
  ok("Prio: gespeichert unter dem eigenen Schlüssel, kein fremder angelegt", aus2.gespeichert && aus2.fremd.length === 0, JSON.stringify(aus2.fremd));

  /* Menü */
  const menue = await page.evaluate(() => { const k = document.getElementById("prio-kasten"), ab = document.getElementById("abschirm-kasten");
    return { da: !!k, vor: !!k && !!ab && (k.compareDocumentPosition(ab) & Node.DOCUMENT_POSITION_FOLLOWING) > 0, stufen: k ? k.querySelectorAll("select, [data-prio-stufe], button").length : 0 }; });
  ok("Prio Menü: Kasten „Was Ihnen wichtig ist“ vor der Abschirmung, mit Einstellungen", menue.da && menue.vor && menue.stufen > 0, JSON.stringify(menue));
  await ctx.close();

  /* Kern fehlt → ungeprüft, nie still */
  ({ ctx, page } = await seite(browser, BASIS, true));
  const ohne = await page.evaluate(() => {
    const m = (neueMail(), MAILS[MAILS.length - 1]); m.text = "Hallo"; jetztSpeichern(m); zeichneLesen();
    const log = []; const r1 = bereit(m, (t) => log.push(t)), r2 = bereit(m, (t) => log.push(t));
    const k = document.querySelector("[data-prio-treffer]");
    return { k: k && k.dataset.prioTreffer, r1: !!r1, r2: !!r2, log, fehlt: !!document.querySelector("[data-prio-fehlt]") };
  });
  ok("Prio ohne Kern: der Kasten heißt „ungeprüft“", ohne.k === "ungeprueft", ohne.k);
  ok("Prio ohne Kern: der erste Tipp hält an und sagt UNGEPRÜFT", !ohne.r1 && /UNGEPRÜFT/.test(ohne.log[0] || "") && ohne.r2, JSON.stringify(ohne));
  ok("Prio ohne Kern: im Menü steht, dass die Liste fehlt", ohne.fehlt);
  await ctx.close();
}

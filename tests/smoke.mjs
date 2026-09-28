/*
 * smoke.mjs — der Sende-Prüfer im echten Browser.
 *
 * Gemessen wird, was ein Mensch erlebt: tippen, sehen, kopieren, senden.
 * Die zwei Anbieter werden mit `page.route` abgefangen — es geht KEIN Aufruf
 * ins Netz, und gemessen wird genau, was hinausgegangen WÄRE.
 *
 * Drei Ausgänge: ✓ grün · ✗ ROT · ⊘ nicht lauffähig (kein Browser/Paket).
 * `| tail` ist zum Lesen da, nicht zum Urteilen — über grün entscheidet der
 * Rückgabewert.
 */
import http from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findeChromium } from "./chromium-finden.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
let gruen = 0, rot = 0;
const ok = (satz, bed, info) => {
  if (bed) { gruen++; console.log("✓ " + satz); }
  else { rot++; console.log("✗ ROT: " + satz + (info !== undefined ? "  → " + info : "")); }
};
function ende() { console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0; }

let chromium;
try { ({ chromium } = await import("playwright-core")); }
catch { console.log("⊘ nicht lauffähig: playwright-core fehlt (npm install)"); process.exit(0); }
const exe = findeChromium();
if (!exe) { console.log("⊘ nicht lauffähig: kein Chromium gefunden"); process.exit(0); }

/* ── ohne Browser: Größe und Bauart ──────────────────────────────────────── */
const html = readFileSync(join(WURZEL, "sende-pruefer.html"), "utf8");
const groesse = ["sende-pruefer.html", "koeder.txt", "LIESMICH.md", "PROBE.md"]
  .reduce((s, f) => { try { return s + statSync(join(WURZEL, f)).size; } catch { return s; } }, 0);
/* 96 KB statt 48 KB: Klaus 2026-09-28 für das Postfach. Die Grenze gilt dem Code
   und der Anleitung, nicht den Mails — die liegen in IndexedDB auf dem Gerät. */
ok(`die vier Dateien zusammen unter 96 KB (${groesse} Bytes)`, groesse > 0 && groesse < 96 * 1024);
ok("keine fremde Quelle im Markup (src/href nach draußen außer Links zum Anklicken)",
  !/<(?:script|link|img|iframe)[^>]+(?:src|href)=["']https?:/i.test(html));
ok("kein Eingabefeld für eine Adresse (keine type=url, kein Feld namens adresse/url/endpoint)",
  !/<input[^>]+(?:type=["']url["']|id=["'](?:adresse|url|endpoint)["'])/i.test(html));
const anbieterBlock = (html.match(/const ANBIETER = Object\.freeze\(\{([\s\S]*?)\n\}\);/) || [])[1] || "";
ok("die Anbieter stehen als benannte, eingefrorene Konstante",
  /anthropic:/.test(anbieterBlock) && /mistral:/.test(anbieterBlock));
const adressen = [...html.matchAll(/https:\/\/api\.[a-z.]+\/[a-z/]+/g)].map((m) => m[0]);
ok("jede API-Adresse im Code steht in dieser Konstante",
  adressen.length >= 2 && adressen.every((a) => anbieterBlock.includes(a)), adressen.join(", "));
const liesmich = readFileSync(join(WURZEL, "LIESMICH.md"), "utf8");
const grenzen = ((liesmich.split(/## Grenzen/)[1] || "").split(/\n## /)[0].match(/^\d+\. /gm) || []).length;
ok(`LIESMICH nennt mindestens fünf Grenzen (${grenzen})`, grenzen >= 5);
ok("LIESMICH nennt vor der Bedienung zwei Fälle, in denen man zur Seite greift",
  liesmich.indexOf("## Wann man dazu greift") > -1
  && liesmich.indexOf("## Wann man dazu greift") < liesmich.indexOf("## So geht es")
  && (liesmich.split("## Wann man dazu greift")[1].split("## So geht es")[0].match(/\*\*\d · /g) || []).length >= 2);

/* ── der Prüfkern ist Sage-Modul 25, byte-1:1 (seit 2026-09-28) ─────────────
   Wer das Modul in Sage ändert, kopiert es neu und zieht MODUL25_SHA nach.
   Eine Abwandlung HIER wäre eine zweite Fassung, die niemand prüft. */
const MODUL25 = "modules/25_pseudonym.js";
const MODUL25_SHA = "7a70fb022130d1f8275e6467b82b9a60370d1f7ce2fe9fc8e0370a735ce1eba2";
const modulBytes = (() => { try { return readFileSync(join(WURZEL, MODUL25)); } catch { return null; } })();
ok("Modul 25 liegt bei (" + MODUL25 + ")", !!modulBytes);
ok("Modul 25 ist unverändert (SHA-256 gepinnt)",
  !!modulBytes && createHash("sha256").update(modulBytes).digest("hex") === MODUL25_SHA);
const sageKopie = join(WURZEL, "..", "Sage-Protokol", "src", "modules", "25_pseudonym.js");
if (existsSync(sageKopie)) ok("… und byte-gleich mit Sage-Protokol daneben", !!modulBytes && readFileSync(sageKopie).equals(modulBytes));
else console.log("⊘ Sage-Protokol liegt nicht daneben — der Vergleich mit Sage ist hier nicht messbar");
ok("die Seite lädt Modul 25 vor ihrem eigenen Skript",
  html.indexOf('<script src="' + MODUL25 + '">') > -1 && html.indexOf('<script src="' + MODUL25 + '">') < html.indexOf("<script>\n"));
ok("die Seite trägt keine eigenen Erkennungs-Muster mehr (keine zweite Fassung)",
  !/const (?:SCHLUESSEL_MUSTER|IBAN_FORM|BETRAG|TELEFON|BELEG_FREI|MAIL) =/.test(html));
ok("Modul 25 steht im Offline-Vorrat", readFileSync(join(WURZEL, "sw.js"), "utf8").includes('"' + MODUL25 + '"'));

/* ── Server auf Port 0 — ein fester Port kollidiert mit einem zweiten Lauf ─ */
const TYP = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
  ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };
const server = http.createServer((q, a) => {
  const p = decodeURIComponent(new URL(q.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
  try { const b = readFileSync(join(WURZEL, p)); a.writeHead(200, { "content-type": TYP[extname(p)] || "application/octet-stream" }); a.end(b); }
  catch { a.writeHead(404); a.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASIS = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: exe });
try {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASIS.slice(0, -1) });
  const page = await ctx.newPage();

  /* Jeder Aufruf nach draußen wird mitgeschrieben. Die zwei Anbieter
     antworten gestellt, alles andere wird abgewiesen. */
  const draussen = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const q = route.request();
    draussen.push({ url: q.url(), headers: q.headers(), body: q.postData() || "" });
    if (q.url().startsWith("https://api.anthropic.com/")) {
      const txt = JSON.parse(q.postData()).messages[0].content;
      const ph = (txt.match(/⟦NAME-1⟧/) || [""])[0];
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: `Liebe ${ph}, die Summe ⟦BETRAG-1⟧ ist erledigt.` }] }) });
    }
    if (q.url().startsWith("https://api.mistral.ai/"))
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "Bitte an ⟦MAIL-1⟧ antworten." } }] }) });
    return route.abort();
  });

  const bereit = (p) => p.waitForFunction(() => window.SendePruefer && window.SendePruefer.bereit === true);
  /* Ordner wählen: am Handy über die Leiste unten, sonst links. */
  const geheOrdner = async (p, id) => { const unten = p.locator(`#bottomnav [data-ordner="${id}"]`);
    await ((await unten.isVisible()) ? unten : p.locator(`#ordnerliste [data-ordner="${id}"]`)).click(); };
  const verfassen = async (p) => { const f = p.locator("#fab"); await ((await f.isVisible()) ? f : p.locator("#neu")).click(); await p.waitForSelector("#text"); };
  const sichtbar = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.checkVisibility(); }, sel);
  await page.goto(BASIS + "index.html");
  await page.waitForFunction(() => location.pathname.endsWith("sende-pruefer.html"));
  await bereit(page);
  ok("index.html leitet auf die Seite weiter", page.url().endsWith("sende-pruefer.html"));
  ok("beim Laden geht kein Aufruf nach draußen", draussen.length === 0, draussen.map((d) => d.url).join(", "));

  /* ── das Postfach: Ordner, Beispiele beim ersten Öffnen ─────────────── */
  const ordner = await page.evaluate(() => [...document.querySelectorAll("#ordnerliste [data-ordner]")].map((e) => e.dataset.ordner));
  ok("vier Ordner: Eingefügt · Entwürfe · KI-Antworten · Exportiert", JSON.stringify(ordner) === '["eingang","entwurf","antwort","export"]', ordner.join(","));
  const saat = await page.evaluate(() => window.SendePruefer.mails().map((m) => m.bid + "@" + m.ordner).sort());
  ok("beim ersten Öffnen liegen die drei Beispiele da", JSON.stringify(saat) === '["eva@entwurf","jonas@eingang","petra@eingang"]', saat.join(","));
  ok("jede Zeile im Postfach trägt ihre Schutz-Zahl und die Marke „Beispiel“",
    await page.evaluate(() => [...document.querySelectorAll("#liste .zeile")].every((z) => z.querySelector("[data-anzahl-chip]") && /Beispiel/.test(z.textContent))));

  /* Zweck zuerst: der erste Satz sagt, was ein Nutzer davon hat. */
  const zweck = await page.evaluate(() => {
    const z = document.querySelector("[data-zweck]"), s = document.querySelector("#lesen");
    return { text: z && z.textContent, vor: z && s && !!(z.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  ok("der Zweck steht vor der Bedienung und nennt, wovor die Seite schützt",
    zweck.vor && /Kunden/.test(zweck.text || "") && /nicht beim KI-Anbieter/.test(zweck.text || ""));

  /* ── ein eigener Entwurf ─────────────────────────────────────────────── */
  await page.click("#fab");
  await page.waitForSelector("#text");
  ok("Verfassen öffnet einen leeren Entwurf in „Entwürfe“",
    await page.evaluate(() => document.querySelector('#ordnerliste [data-ordner="entwurf"]').getAttribute("aria-current") === "true"));
  ok("an einer eigenen Mail steht kein Beispiel-Hinweis", !(await page.$("[data-beispiel-meldung]")));
  ok("ohne Namen sagt die Seite, dass kein Name verdeckt wird", await sichtbar(page, "[data-ohne-namen]"));
  await page.click("#ki-oeffnen");
  const felder = await page.evaluate(() => ["data-namen-zweck", "data-schluessel-zweck"].map((m) => {
    const e = document.querySelector("[" + m + "]"); return e ? e.textContent : "";
  }));
  ok("das Namen-Feld sagt in seinem ersten Satz, wozu es da ist", /damit|dann ebenfalls verdeckt/i.test(felder[0]));
  ok("das Schlüssel-Feld sagt, wozu es da ist", /Damit/.test(felder[1]));

  /* Die zwei Wege: gleichrangig, nebeneinander, jeder mit seinem Wofür. */
  const wege = await page.evaluate(() => ["#s-kopieren", "#s-senden"].map((s) => {
    const r = document.querySelector(s).getBoundingClientRect(); return { w: r.width, t: r.top };
  }));
  const wegeTexte = await page.evaluate(() => [...document.querySelectorAll("[data-weg-zweck]")].map((e) => e.textContent));
  ok("Kopieren nennt das eigene KI-Abo, ohne Schlüssel und ohne Zusatzkosten",
    /eigenes KI-Abo/.test(wegeTexte[0] || "") && /ohne Schlüssel/.test(wegeTexte[0] || "") && /ohne zusätzliche Kosten/.test(wegeTexte[0] || ""));
  ok("Senden nennt: ohne Fenster zu wechseln, kostet, was der Schlüssel kostet",
    /ohne Fenster zu wechseln/i.test(wegeTexte[1] || "") && /es kostet, was Ihr Schlüssel kostet/.test(wegeTexte[1] || ""));
  ok("kein Weg ist als „stattdessen“ beschriftet", !/stattdessen/i.test(await page.evaluate(() => document.querySelector(".zwei").textContent)));
  ok("beide Karten sind gleich breit", Math.abs(wege[0].w - wege[1].w) < 2, JSON.stringify(wege));
  ok("am Handy stehen die zwei Wege untereinander", wege[1].t > wege[0].t + 20, JSON.stringify(wege));
  await page.setViewportSize({ width: 1200, height: 900 });
  const breit = await page.evaluate(() => ["#s-kopieren", "#s-senden"].map((s) => document.querySelector(s).getBoundingClientRect().top));
  ok("auf breitem Schirm stehen sie nebeneinander", Math.abs(breit[0] - breit[1]) < 2, JSON.stringify(breit));
  ok("auf breitem Schirm stehen Ordner, Liste und Mail nebeneinander",
    await page.evaluate(() => ["nav.ordner", "section.liste", "main.lesen"].map((s) => document.querySelector(s).getBoundingClientRect())
      .every((r, i, a) => r.width > 60 && (i === 0 || r.left >= a[i - 1].right - 1))));
  await page.setViewportSize({ width: 420, height: 900 });

  const text = "Frau Erika Musterfrau schreibt von erika@beispiel.test.\n" +
    "Offen sind 1.248,50 EUR aus RE-2026-04871.\nNochmal: erika@beispiel.test\nRückruf +49 30 1234567";
  await page.fill("#text", text);
  await page.fill("#namen", "Erika Musterfrau");
  await page.click('[data-sicht="ki"]');
  const befund = await page.evaluate(() => ({
    zahl: document.getElementById("anzahl").textContent,
    li: [...document.querySelectorAll("#befunde li")].map((l) => l.dataset.sorte + "@" + l.dataset.zeile),
    verdeckt: document.getElementById("verdeckt").textContent,
    hinweis: document.querySelector("[data-ohne-namen]").checkVisibility(),
  }));
  ok("mit Namen verschwindet der Hinweis", befund.hinweis === false);
  ok("der Befund erscheint beim Tippen, mit Zahl", befund.zahl === "6", befund.zahl);
  ok("jeder Befund trägt Sorte und Zeile",
    JSON.stringify(befund.li) === JSON.stringify(["NAME@1", "MAIL@1", "BETRAG@2", "RECHNUNG@2", "MAIL@3", "TELEFON@4"]), befund.li.join(" "));
  ok("derselbe Wert trägt denselben Platzhalter",
    (befund.verdeckt.match(/⟦MAIL-1⟧/g) || []).length === 2 && !/⟦MAIL-2⟧/.test(befund.verdeckt));
  ok("der Betrag mit Tausenderpunkt ist GANZ verdeckt — kein „1.“ davor",
    /Offen sind ⟦BETRAG-1⟧ aus/.test(befund.verdeckt), befund.verdeckt.split("\n")[1]);
  const werte = ["Erika Musterfrau", "erika@beispiel.test", "1.248,50", "248,50", "RE-2026-04871", "1234567"];
  ok("die verdeckte Fassung enthält keinen der Werte", werte.every((w) => !befund.verdeckt.includes(w)));
  ok("„Was die KI sieht“ trägt die Bitte unter der Mail",
    /\n---\nÜberarbeiten Sie diesen E-Mail-Entwurf/.test(befund.verdeckt));
  ok("im Original ist jeder Fund markiert, in der KI-Fassung jeder Platzhalter",
    (await page.evaluate(() => document.querySelectorAll("#verdeckt .tok").length)) === 6);

  /* ── Kopieren ───────────────────────────────────────────────────────── */
  await page.click("#kopieren");
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  ok("Kopieren legt genau die verdeckte Fassung in die Zwischenablage", kopiert === befund.verdeckt);
  await page.fill("#antwort-ein", "Liebe ⟦NAME-1⟧, wir buchen ⟦BETRAG-1⟧ zurück.");
  ok("eine eingefügte Antwort kommt mit den echten Werten zurück",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, wir buchen 1.248,50 EUR zurück.");

  /* ── Senden ohne Schlüssel: der Knopf sagt, was fehlt ────────────────── */
  await page.fill("#antwort-ein", "");
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("sendepruefer_key_")) localStorage.removeItem(k); });
  await page.selectOption("#anbieter", "anthropic");
  await page.fill("#schluessel", "");
  await page.click("#senden");
  const ohne = await page.textContent("#sende-meldung");
  ok("ohne Schlüssel sagt Senden, was fehlt, und nennt den Kopieren-Weg",
    /Es fehlt ein Schlüssel für Claude/.test(ohne) && /Kopieren/.test(ohne), ohne);
  ok("… und es ging nichts hinaus", draussen.length === 0);
  await page.fill("#schluessel", "falsch-123");
  await page.click("#senden");
  ok("ein Schlüssel mit falschem Anfang wird vor dem Senden abgewiesen",
    /beginnt mit sk-ant-/.test(await page.textContent("#sende-meldung")) && draussen.length === 0);

  /* ── Senden an Anthropic ─────────────────────────────────────────────── */
  await page.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await page.click("#senden");
  await page.waitForFunction(() => /Antwort erhalten|abgelehnt|Keine Verbindung/.test(document.getElementById("sende-meldung").textContent));
  const a = draussen[0] || { headers: {}, body: "{}" };
  ok("Senden geht an genau die Adresse aus der Konstante", a.url === "https://api.anthropic.com/v1/messages", a.url);
  ok("mit den Kopfzeilen des Auftrags",
    a.headers["x-api-key"] === "sk-ant-api03-PROBEnichtECHT0000000000" && a.headers["anthropic-version"] === "2023-06-01"
    && a.headers["anthropic-dangerous-direct-browser-access"] === "true");
  const gesendet = JSON.parse(a.body).messages?.[0]?.content || "";
  ok("gesendet wurde die verdeckte Fassung", gesendet === befund.verdeckt);
  ok("im gesendeten Text steht KEIN Befund-Wert", werte.every((w) => !a.body.includes(w)));
  ok("die Antwort kommt mit den echten Werten zurück",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, die Summe 1.248,50 EUR ist erledigt.");
  ok("die Seite zeigt, was gesendet wurde", (await page.textContent("#gesendet")) === befund.verdeckt);
  ok("der Schlüssel liegt unter einem app-eigenen Namen",
    await page.evaluate(() => localStorage.getItem("sendepruefer_key_anthropic")) === "sk-ant-api03-PROBEnichtECHT0000000000");

  /* ── Speichern: nach dem Neuladen ist die Mail samt Antwort noch da ───── */
  await page.waitForTimeout(400);   // Sorte B: das verzögerte Speichern soll WIRKLICH verstrichen sein
  await page.reload(); await bereit(page);
  const gerettet = await page.evaluate(() => window.SendePruefer.mails().find((m) => /Erika Musterfrau/.test(m.text || "")));
  ok("nach dem Neuladen liegen Mail, Antwort und Zuordnung noch auf dem Gerät",
    !!gerettet && gerettet.ordner === "entwurf" && /erledigt/.test(gerettet.antwortRoh || "") && Object.keys(gerettet.zuordnung || {}).length === 5, JSON.stringify(gerettet && { o: gerettet.ordner, z: Object.keys(gerettet.zuordnung || {}) }));
  await geheOrdner(page, "entwurf");
  await page.click(`#liste .zeile[data-id="${gerettet && gerettet.id}"]`);
  ok("die gespeicherte Antwort wird wieder mit echten Werten gezeigt",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, die Summe 1.248,50 EUR ist erledigt.");

  /* ── Senden an Mistral: das andere Protokoll ─────────────────────────── */
  await page.selectOption("#anbieter", "mistral");
  ok("der Schlüssel des anderen Anbieters wird nicht übernommen", (await page.inputValue("#schluessel")) === "");
  await page.fill("#schluessel", "mistral-PROBE-0000");
  await page.click("#senden");
  await page.waitForFunction(() => /Antwort erhalten/.test(document.getElementById("sende-meldung").textContent) && document.getElementById("antwort-klar").textContent.includes("antworten"));
  const m = draussen[1] || { headers: {}, body: "{}" };
  ok("Mistral bekommt seine Adresse und eine Bearer-Kopfzeile",
    m.url === "https://api.mistral.ai/v1/chat/completions" && m.headers.authorization === "Bearer mistral-PROBE-0000");
  ok("… im OpenAI-Protokoll, mit der verdeckten Fassung",
    JSON.parse(m.body).messages?.[0]?.content === befund.verdeckt && JSON.parse(m.body).model === "mistral-large-latest");
  ok("die Mistral-Antwort wird gelesen und aufgedeckt",
    (await page.textContent("#antwort-klar")) === "Bitte an erika@beispiel.test antworten.");

  /* ── Schlüssel löschen, Zuordnung verwerfen ──────────────────────────── */
  await page.click("#schluessel-weg");
  ok("Schlüssel löschen entfernt ihn", await page.evaluate(() => localStorage.getItem("sendepruefer_key_mistral")) === null);
  await page.click("#verwerfen");
  ok("nach dem Verwerfen setzt die Seite keine Werte mehr ein",
    (await page.textContent("#antwort-klar")) === "Bitte an ⟦MAIL-1⟧ antworten.");
  ok("es ging insgesamt genau zweimal etwas hinaus", draussen.length === 2, draussen.length);

  /* ── Beispiel-E-Mail (Klaus 2026-09-28): ein Tipp zeigt den ganzen Weg ── */
  await page.click("#menue");
  await page.click("#beispiel");
  await page.waitForFunction(() => /Rechnung RE-2026/.test((document.querySelector("h1.betreff") || {}).textContent || ""));
  const bspOrig = await page.evaluate(() => document.querySelector("main.lesen .blatt").textContent);
  ok("das Beispiel ist eine E-Mail mit Kopfzeilen", /^Von: .*\nAn: .*\nBetreff: /.test(bspOrig), bspOrig.slice(0, 80));
  await page.click('[data-sicht="ki"]');
  const bsp = await page.evaluate(() => ({
    ver: document.getElementById("verdeckt").textContent,
    klar: (document.getElementById("antwort-klar") || {}).textContent || "",
    hin: !!document.querySelector("[data-beispiel-meldung]") && document.querySelector("[data-beispiel-meldung]").checkVisibility(),
  }));
  const bspWerte = ["Petra Beispiel", "Musterbau GmbH", "petra.beispiel@musterbau.example", "buchhaltung@beispiel-firma.example",
    "RE-2026-04871", "1.248,50", "DE89 3704", "+49 170"];
  const bspDrin = bspWerte.filter((w) => bsp.ver.includes(w));
  ok("in der verdeckten Fassung steht kein Wert des Beispiels", bsp.ver.length > 50 && bspDrin.length === 0, bspDrin.join(" · "));
  ok("keine führende 1. vor dem Betrags-Platzhalter", /über ⟦BETRAG-1⟧/.test(bsp.ver));
  ok("die Beispiel-Antwort kommt mit den echten Angaben zurück",
    /Frau Beispiel,/.test(bsp.klar) && bsp.klar.includes("RE-2026-04871") && bsp.klar.includes("1.248,50 EUR") && !/⟦/.test(bsp.klar), bsp.klar.slice(0, 120));
  ok("am Beispiel sagt die Seite, dass alles erfunden ist", bsp.hin);
  ok("das Beispiel liegt nur einmal im Postfach (kein Doppel)",
    await page.evaluate(() => window.SendePruefer.mails().filter((m) => m.bid === "petra" && m.ordner === "eingang").length === 1));

  /* ── Antwort ablegen und als .eml speichern ──────────────────────────── */
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#antwort-eml")]);
  const eml = readFileSync(await dl.path(), "utf8");
  ok("die .eml ist an den Absender adressiert, mit Betreff „Re:“",
    /^To: "Petra Beispiel" <petra\.beispiel@musterbau\.example>\r\n/m.test(eml) && /^Subject: Re: Rechnung RE-2026-04871 noch offen\r\n/m.test(eml), eml.slice(0, 160));
  ok("… trägt UTF-8, X-Unsent und die Antwort MIT echten Angaben, ohne Platzhalter",
    /Content-Type: text\/plain; charset=utf-8/.test(eml) && /X-Unsent: 1/.test(eml) && eml.includes("1.248,50 EUR") && !/⟦/.test(eml));
  const nachEml = await page.evaluate(() => window.SendePruefer.mails().filter((m) => m.bezug && /^Re: Rechnung/.test(m.betreff)).map((m) => m.ordner));
  ok("die gespeicherte Antwort liegt danach genau einmal in „Exportiert“", JSON.stringify(nachEml) === '["export"]', nachEml.join(","));

  /* ── Teilen: dieselbe .eml geht an das Teilen-Fenster ────────────────── */
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__geteilt = d.files.map((f) => f.name + "|" + f.type); } });
  });
  await page.click("#antwort-teilen");
  await page.waitForFunction(() => window.__geteilt, null, { timeout: 4000 }).catch(() => {});
  const geteilt = (await page.evaluate(() => window.__geteilt)) || [];
  ok("Teilen reicht genau eine .eml als message/rfc822 weiter", geteilt.length === 1 && /\.eml\|message\/rfc822$/.test(geteilt[0]), geteilt.join(","));

  /* ── .eml hin und zurück, Umlaute im Kopf ────────────────────────────── */
  const rund = await page.evaluate(() => {
    const m = { anName: "Jörg Übel", anAdr: "j@x.example", betreff: "Grüße aus Köln — und ein sehr langer Betreff, der umbrechen muss, weil er so lang ist", text: "Zeile 1\nÄrger über 12,00 €" };
    const e = window.SendePruefer.emlBauen(m), z = window.SendePruefer.mailLesen(e);
    return { ok: z.anName === m.anName && z.betreff === m.betreff && z.text === m.text, e, z };
  });
  ok("eine .eml mit Umlauten im Betreff geht hin und zurück ohne Verlust", rund.ok, JSON.stringify(rund.z));
  ok("… und ihr Kopf ist reines ASCII (RFC 2047)", /^[\x00-\x7f]*$/.test(rund.e.split("\r\n\r\n")[0]));

  /* ── Mail einfügen: roh aus einem Mail-Programm ──────────────────────── */
  const vonKodiert = "=?UTF-8?B?" + Buffer.from("Jörg Beispiel").toString("base64") + "?=";
  const rohEml = [`From: ${vonKodiert} <joerg@probe.example>`, "To: info@firma.example", "Subject: =?UTF-8?Q?Gr=C3=BC=C3=9Fe_aus_K=C3=B6ln?=",
    "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="GRENZE"', "", "--GRENZE",
    "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: quoted-printable", "",
    "Sch=C3=B6ne Gr=C3=BC=C3=9Fe, Rechnung RE-2026-00077 =C3=BCber 99,00 EUR.", "--GRENZE",
    "Content-Type: text/html; charset=utf-8", "", "<p>HTML</p>", "--GRENZE--", ""].join("\r\n");
  await page.click("#einfuegen");
  await page.fill("#einfuegen-text", rohEml);
  await page.click("#einfuegen-ok");
  await page.waitForFunction(() => !document.getElementById("einfuegen-dialog").open);
  const ein = await page.evaluate(() => window.SendePruefer.mails().find((m) => m.vonAdr === "joerg@probe.example"));
  ok("eingefügte Mail: Absender, Betreff und Text sind entschlüsselt",
    !!ein && ein.vonName === "Jörg Beispiel" && ein.betreff === "Grüße aus Köln" && ein.text === "Schöne Grüße, Rechnung RE-2026-00077 über 99,00 EUR.", JSON.stringify(ein));
  ok("… liegt in „Eingefügt“, und der Absendername wird ohne Zutun verdeckt",
    !!ein && ein.ordner === "eingang" && (await page.textContent("#anzahl")) === "5" && !(await sichtbar(page, "[data-ohne-namen]")), await page.textContent("#anzahl"));
  const deutsch = await page.evaluate(() => window.SendePruefer.mailLesen("Von: Anna Probe <anna@probe.example>\nBetreff: Hallo\n\nText hier"));
  ok("eingefügter Text mit deutschen Kopfzeilen wird ebenso gelesen",
    deutsch.vonName === "Anna Probe" && deutsch.vonAdr === "anna@probe.example" && deutsch.betreff === "Hallo" && deutsch.text === "Text hier");
  await page.click("#einfuegen");
  await page.setInputFiles("#einfuegen-datei", { name: "brief.eml", mimeType: "message/rfc822", buffer: Buffer.from(rohEml.replace("joerg@", "datei@")) });
  await page.waitForFunction(() => window.SendePruefer.mails().some((m) => m.vonAdr === "datei@probe.example"));
  ok("eine .eml-Datei lässt sich ebenso öffnen", true);

  /* ── Suche ───────────────────────────────────────────────────────────── */
  await geheOrdner(page, "eingang");
  await page.fill("#suche", "Holzwurm");
  const gesucht = await page.evaluate(() => [...document.querySelectorAll("#liste .zeile .wer")].map((e) => e.textContent));
  ok("die Suche findet nur die passende Mail", JSON.stringify(gesucht) === '["Jonas Beispielmann"]', gesucht.join(","));
  await page.fill("#suche", "");

  /* ── Hell und dunkel ─────────────────────────────────────────────────── */
  const grund = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const vorher = await grund();
  await page.click("#thema");
  const nachher = await grund();
  ok("der Umschalter wechselt hell und dunkel", vorher !== nachher, vorher + " → " + nachher);
  await page.reload(); await bereit(page);
  ok("… und die Wahl übersteht das Neuladen", (await grund()) === nachher);

  /* ── Selbsttest über das Menü ────────────────────────────────────────── */
  await page.click("#menue");
  await page.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await page.click("#test-start");
  await page.waitForFunction(() => window.__selbsttest);
  const st = await page.evaluate(() => window.__selbsttest);
  ok(`der Selbsttest besteht (${st.gut} von ${st.gesamt})`, st.gut === st.gesamt && st.gesamt >= 20,
    st.erg.filter((e) => !e.ok).map((e) => e.satz).join(" | "));
  const summe = await page.textContent("#test-summe");
  console.log("  PROBE: " + summe);
  console.log("  PROBE-ZEILEN:\n" + st.erg.map((e) => "    " + (e.ok ? "✓ " : "✗ ") + e.satz).join("\n"));
  await page.click("#menue-zu");
  ok("mit Modul 25 steht der Hinweis NICHT da", !(await sichtbar(page, "[data-modul-fehlt]")));

  /* ── Handy: eine Spalte, Liste ODER Mail, kein Querlauf ──────────────── */
  await page.setViewportSize({ width: 360, height: 800 });
  await page.click('#bottomnav [data-ordner="eingang"]');
  ok("am Handy steht die Liste allein, mit Ordnerleiste unten",
    (await sichtbar(page, "section.liste")) && !(await sichtbar(page, "main.lesen")) && (await sichtbar(page, "#bottomnav")));
  await page.click("#liste .zeile");
  ok("ein Tipp auf eine Mail zeigt sie allein, mit „Zurück“",
    !(await sichtbar(page, "section.liste")) && (await sichtbar(page, "main.lesen")) && (await sichtbar(page, ".knopf.zurueck")));
  await page.click("#ki-oeffnen");
  ok("bei 360 px läuft nichts quer", await page.evaluate(() => document.documentElement.scrollWidth <= 360));
  await page.click(".knopf.zurueck");
  ok("„Zurück“ bringt die Liste wieder", await sichtbar(page, "section.liste"));

  /* ── als Datei geöffnet: läuft, und der Selbsttest sagt, was zu tun ist ── */
  const datei = await ctx.newPage();
  const fehler = [];
  datei.on("pageerror", (e) => fehler.push(String(e)));
  await datei.goto(pathToFileURL(join(WURZEL, "sende-pruefer.html")).href);
  await bereit(datei);
  await verfassen(datei);
  await datei.fill("#text", "a@b.de");
  ok("direkt als Datei geöffnet funktioniert die Prüfung", (await datei.textContent("#anzahl")) === "1" && fehler.length === 0, fehler.join(" "));
  await datei.click("#menue");
  await datei.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await datei.click("#test-start");
  await datei.waitForFunction(() => document.getElementById("test-summe").textContent.length > 0);
  ok("… und der Selbsttest nennt den Weg über die Dateiwahl", /koeder\.txt/.test(await datei.textContent("#test-summe")));
  await datei.setInputFiles("#test-datei", join(WURZEL, "koeder.txt"));
  await datei.waitForFunction(() => window.__selbsttest);
  const st2 = await datei.evaluate(() => window.__selbsttest);
  ok("über die Dateiwahl besteht er ebenso", st2.gut === st2.gesamt);

  /* Eine eigene Mail aufschreiben und bis „Mit KI“ öffnen. */
  async function entwurf(p, t) { await verfassen(p); await p.fill("#text", t); await p.click("#ki-oeffnen"); }

  /* ── ohne Modul 25: die Seite sagt es und lässt nichts hinaus ─────────── */
  /* ⚠ EIGENER KONTEXT. Im Kontext der normalen Seite ist das Modul schon im
     Speicher, und die 404 käme nie an. Die Zeile „wirklich angefragt"
     darunter besteht darauf, dass gemessen wurde. */
  const ohneCtx = await browser.newContext({ serviceWorkers: "block" });
  const ohneModul = await ohneCtx.newPage();
  ohneModul.__geholt = [];
  ohneModul.on("request", (q) => ohneModul.__geholt.push(q.url()));
  await ohneModul.route("**/modules/25_pseudonym.js", (r) => r.fulfill({ status: 404, body: "" }));
  await ohneModul.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ohneModul.goto(BASIS + "sende-pruefer.html");
  await bereit(ohneModul);
  ok("fehlt Modul 25, steht der Hinweis sichtbar da", await sichtbar(ohneModul, "[data-modul-fehlt]"));
  await entwurf(ohneModul, "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
  await ohneModul.click("#kopieren");
  ok("… und Kopieren wird verweigert, mit Grund",
    /Prüfkern fehlt/.test(await ohneModul.textContent("#kopier-meldung")));
  await ohneModul.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await ohneModul.click("#senden");
  ok("… und Senden wird verweigert, mit Grund",
    /Prüfkern fehlt/.test(await ohneModul.textContent("#sende-meldung")));
  ok("… und das Modul wurde wirklich angefragt und abgewiesen (sonst misst dieser Abschnitt nichts)",
    ohneModul.__geholt.some((u) => u.endsWith("/modules/25_pseudonym.js")));
  await ohneCtx.close();
  /* ── die letzte Sicherung: versagt das Verdecken, geht nichts hinaus ─────
     Gestellt wird ein Prüfkern, der die Werte FINDET, aber nicht ersetzt.
     Nur in dieser Lage greift die Sicherung; ohne sie war sie von ihrem
     Fehlen nicht zu unterscheiden (Gegenprobe 2026-09-28: blind). */
  const kaputtCtx = await browser.newContext({ serviceWorkers: "block" });
  const kaputt = await kaputtCtx.newPage();
  const quelle = modulBytes ? modulBytes.toString("utf8") : "";
  const kaputtQuelle = quelle.replace("return { text: out + text.slice(pos), map:", "return { text: text, map:");
  ok("der gestellte kaputte Prüfkern unterscheidet sich wirklich", !!quelle && kaputtQuelle !== quelle);
  await kaputt.route("**/modules/25_pseudonym.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: kaputtQuelle }));
  const kaputtRaus = [];
  await kaputt.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { kaputtRaus.push(r.request().url()); return r.abort(); });
  await kaputt.goto(BASIS + "sende-pruefer.html");
  await bereit(kaputt);
  await entwurf(kaputt, "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
  await kaputt.click("#kopieren");
  ok("versagt das Verdecken, wird NICHT kopiert", /gefundenen Wert/.test(await kaputt.textContent("#kopier-meldung")));
  await kaputt.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await kaputt.click("#senden");
  ok("versagt das Verdecken, wird NICHT gesendet", /gefundenen Wert/.test(await kaputt.textContent("#sende-meldung")) && kaputtRaus.length === 0);
  await kaputtCtx.close();
} catch (e) {
  rot++; console.log("✗ ROT: unterwegs gestolpert → " + (e && e.stack || e));
} finally {
  await browser.close(); server.close(); ende();
}

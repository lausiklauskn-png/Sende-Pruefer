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
ok(`die vier Dateien zusammen unter 48 KB (${groesse} Bytes)`, groesse > 0 && groesse < 48 * 1024);
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

  await page.goto(BASIS + "index.html");
  await page.waitForFunction(() => location.pathname.endsWith("sende-pruefer.html") && window.SendePruefer);
  ok("index.html leitet auf die Seite weiter", page.url().endsWith("sende-pruefer.html"));
  ok("beim Laden geht kein Aufruf nach draußen", draussen.length === 0, draussen.map((d) => d.url).join(", "));

  /* Zweck zuerst: der erste Satz sagt, was ein Nutzer davon hat. */
  const zweck = await page.evaluate(() => {
    const z = document.querySelector("[data-zweck]"), s = document.querySelector("#s-eingabe");
    return { text: z && z.textContent, vor: z && s && !!(z.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  ok("der Zweck steht vor der Bedienung und nennt, wovor die Seite schützt",
    zweck.vor && /Kunden/.test(zweck.text || "") && /nicht beim KI-Anbieter/.test(zweck.text || ""));
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
  await page.setViewportSize({ width: 1000, height: 900 });
  const breit = await page.evaluate(() => ["#s-kopieren", "#s-senden"].map((s) => document.querySelector(s).getBoundingClientRect().top));
  ok("auf breitem Schirm stehen sie nebeneinander", Math.abs(breit[0] - breit[1]) < 2, JSON.stringify(breit));
  await page.setViewportSize({ width: 420, height: 900 });

  /* ── die Namen-Liste ─────────────────────────────────────────────────── */
  ok("ohne Namen sagt die Seite, dass kein Name verdeckt wird",
    await page.evaluate(() => { const e = document.querySelector("[data-ohne-namen]"); return !!e && e.checkVisibility(); }));

  const text = "Frau Erika Musterfrau schreibt von erika@beispiel.test.\n" +
    "Offen sind 1.248,50 EUR aus RE-2026-04871.\nNochmal: erika@beispiel.test\nRückruf +49 30 1234567";
  await page.fill("#eingabe", text);
  await page.fill("#namen", "Erika Musterfrau");
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

  /* ── Kopieren ───────────────────────────────────────────────────────── */
  await page.click("#kopieren");
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  ok("Kopieren legt genau die verdeckte Fassung in die Zwischenablage", kopiert === befund.verdeckt);
  await page.fill("#antwort-ein", "Liebe ⟦NAME-1⟧, wir buchen ⟦BETRAG-1⟧ zurück.");
  ok("eine eingefügte Antwort kommt mit den echten Werten zurück",
    (await page.textContent("#antwort-klar")) === "Liebe Erika Musterfrau, wir buchen 1.248,50 EUR zurück.");

  /* ── Senden ohne Schlüssel: der Knopf sagt, was fehlt ────────────────── */
  await page.fill("#antwort-ein", "");
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) localStorage.removeItem(k); });
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

  /* ── Selbsttest über den Knopf ───────────────────────────────────────── */
  await page.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await page.click("#test-start");
  await page.waitForFunction(() => window.__selbsttest);
  const st = await page.evaluate(() => window.__selbsttest);
  ok(`der Selbsttest besteht (${st.gut} von ${st.gesamt})`, st.gut === st.gesamt && st.gesamt >= 20,
    st.erg.filter((e) => !e.ok).map((e) => e.satz).join(" | "));
  const summe = await page.textContent("#test-summe");
  console.log("  PROBE: " + summe);
  console.log("  PROBE-ZEILEN:\n" + st.erg.map((e) => "    " + (e.ok ? "✓ " : "✗ ") + e.satz).join("\n"));

  /* ── als Datei geöffnet: läuft, und der Selbsttest sagt, was zu tun ist ── */
  const datei = await ctx.newPage();
  const fehler = [];
  datei.on("pageerror", (e) => fehler.push(String(e)));
  await datei.goto(pathToFileURL(join(WURZEL, "sende-pruefer.html")).href);
  await datei.fill("#eingabe", "a@b.de");
  ok("direkt als Datei geöffnet funktioniert die Prüfung", (await datei.textContent("#anzahl")) === "1" && fehler.length === 0, fehler.join(" "));
  await datei.evaluate(() => { document.getElementById("selbsttest").open = true; });
  await datei.click("#test-start");
  await datei.waitForFunction(() => document.getElementById("test-summe").textContent.length > 0);
  ok("… und der Selbsttest nennt den Weg über die Dateiwahl", /koeder\.txt/.test(await datei.textContent("#test-summe")));
  await datei.setInputFiles("#test-datei", join(WURZEL, "koeder.txt"));
  await datei.waitForFunction(() => window.__selbsttest);
  const st2 = await datei.evaluate(() => window.__selbsttest);
  ok("über die Dateiwahl besteht er ebenso", st2.gut === st2.gesamt);

  /* ── ohne Modul 25: die Seite sagt es und lässt nichts hinaus ─────────── */
  /* ⚠ EIGENER KONTEXT. Die erste Fassung öffnete diese Seite im Kontext der
     normalen Seite und war rot, obwohl die Seite tadellos war: dort war das
     Modul schon geladen, und die 404 kam nie an (nachgestellt 2026-09-28:
     im frischen Kontext grün, auch mit erlaubtem Service-Worker). Die
     Zeile „wirklich angefragt" darunter besteht darauf, dass gemessen wurde. */
  const ohneCtx = await browser.newContext({ serviceWorkers: "block" });
  const ohneModul = await ohneCtx.newPage();
  ohneModul.__geholt = [];
  ohneModul.on("request", (q) => ohneModul.__geholt.push(q.url()));
  await ohneModul.route("**/modules/25_pseudonym.js", (r) => r.fulfill({ status: 404, body: "" }));
  await ohneModul.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ohneModul.goto(BASIS + "sende-pruefer.html");
  await ohneModul.waitForFunction(() => !!window.SendePruefer);
  ok("fehlt Modul 25, steht der Hinweis sichtbar da",
    await ohneModul.evaluate(() => { const e = document.querySelector("[data-modul-fehlt]"); return !!e && e.checkVisibility(); }));
  await ohneModul.fill("#eingabe", "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
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
  await kaputt.waitForFunction(() => !!window.SendePruefer && !!window.SbkimPseudonym);
  await kaputt.fill("#eingabe", "Frau Erika Musterfrau, IBAN DE89 3704 0044 0532 0130 00");
  await kaputt.click("#kopieren");
  ok("versagt das Verdecken, wird NICHT kopiert", /gefundenen Wert/.test(await kaputt.textContent("#kopier-meldung")));
  await kaputt.fill("#schluessel", "sk-ant-api03-PROBEnichtECHT0000000000");
  await kaputt.click("#senden");
  ok("versagt das Verdecken, wird NICHT gesendet", /gefundenen Wert/.test(await kaputt.textContent("#sende-meldung")) && kaputtRaus.length === 0);
  await kaputtCtx.close();

  /* ── Beispiel-E-Mail (Klaus 2026-09-28): ein Tipp zeigt den ganzen Weg ── */
  await page.fill("#eingabe", ""); await page.fill("#namen", ""); await page.fill("#antwort-ein", "");
  ok("vor dem Tipp ist der Beispiel-Hinweis verborgen",
    await page.evaluate(() => !document.querySelector("[data-beispiel-meldung]").checkVisibility()));
  await page.click("#beispiel");
  const bsp = await page.evaluate(() => ({
    ein: document.getElementById("eingabe").value,
    ver: document.getElementById("verdeckt").textContent,
    klar: document.getElementById("antwort-klar").textContent,
    hin: document.querySelector("[data-beispiel-meldung]").checkVisibility(),
  }));
  ok("das Beispiel ist eine E-Mail mit Kopfzeilen", /^Von: .*\nAn: .*\nBetreff: /.test(bsp.ein));
  const bspWerte = ["Petra Beispiel", "Musterbau GmbH", "petra.beispiel@musterbau.example", "buchhaltung@beispiel-firma.example",
    "RE-2026-04871", "1.248,50", "DE89 3704", "+49 170"];
  const bspDrin = bspWerte.filter((w) => bsp.ver.includes(w));
  ok("in der verdeckten Fassung steht kein Wert des Beispiels", bsp.ver.length > 50 && bspDrin.length === 0, bspDrin.join(" · "));
  ok("keine führende 1. vor dem Betrags-Platzhalter", /über ⟦BETRAG-1⟧/.test(bsp.ver));
  ok("die Beispiel-Antwort kommt mit den echten Angaben zurück",
    /Frau Beispiel,/.test(bsp.klar) && bsp.klar.includes("RE-2026-04871") && bsp.klar.includes("1.248,50 EUR") && !/⟦/.test(bsp.klar), bsp.klar.slice(0, 120));
  ok("nach dem Tipp sagt die Seite, dass alles erfunden ist", bsp.hin);

  ok("mit Modul 25 steht der Hinweis NICHT da",
    await page.evaluate(() => { const e = document.querySelector("[data-modul-fehlt]"); return !!e && !e.checkVisibility(); }));

  /* ── kein Querlauf am Handy ──────────────────────────────────────────── */
  await page.setViewportSize({ width: 360, height: 800 });
  ok("bei 360 px läuft nichts quer", await page.evaluate(() => document.documentElement.scrollWidth <= 360));
} catch (e) {
  rot++; console.log("✗ ROT: unterwegs gestolpert → " + (e && e.stack || e));
} finally {
  await browser.close(); server.close(); ende();
}

/* Sende-Prüfer — Sprache der Oberfläche: Deutsch · English · Русский (Klaus 2026-10-02).
   „Sprachwahl je App getrennt": eigener Schlüssel `sendepruefer_lang`, die ausdrückliche
   Wahl unter `sendepruefer_lang_wahl` (nur ein Klick setzt sie).

   Wie es arbeitet (übernommen aus Workflow PDF `assets/sprache.js`): die Seite schreibt
   weiter Deutsch. Diese Datei übersetzt, was im DOM steht — beim Start und bei jeder
   Änderung (MutationObserver). Deshalb braucht die Seite selbst nur EINE Zeile (die vier
   Dateien müssen unter 96 KB bleiben), und alles, was `anhaenge.js`, `aussen.js`,
   `tresor-ui.js` oder `sbkim-init.js` später einhängen, wird mitübersetzt.

   Zwei Stufen: ein Element aus Text und Inline-Auszeichnung wird als GANZER Satz
   nachgeschlagen, sonst jedes Textstück einzeln. Titel, Platzhalter, aria-label ebenso.
   Schlüssel dürfen {} tragen; im Wert steht {1}, {2} … Fehlt ein Eintrag, bleibt das
   Deutsche stehen (fail-soft) und wird in `fehlt`/`fehltSatz` gemerkt — die Probe liest das.

   NIE übersetzt: was der NUTZER geschrieben hat oder was aus seiner Mail kommt (Betreff,
   Absender, Mailtext, Funde, Platzhalter, Anhang-Namen, eigene Aufgaben ★), Eingabefelder,
   Codes der Befundarten. Siehe `GESCHUETZT`.

   ⚠ BENANNTE GRENZEN: die Befund-Sätze aus `pruefer-anhang.js`/`pruefer-mail.js` sind
   Deutsch (Kanon, mit Python-Zwilling) und werden nur übersetzt, soweit sie im Wörterbuch
   stehen · die Anweisung an die KI („Aufgabe: Schreibe …") bleibt Deutsch — die KI
   versteht sie, und der Text steht in einem Eingabefeld · Impressum und Datenschutz
   werden nicht übersetzt. */
(function () {
  "use strict";
  const KEY = "sendepruefer_lang", KEY_WAHL = "sendepruefer_lang_wahl";
  const SPRACHEN = [
    { code: "de", name: "Deutsch", kurz: "DE" },
    { code: "en", name: "English", kurz: "EN" },
    { code: "ru", name: "Русский", kurz: "RU" }
  ];
  const INLINE = new Set(["B", "STRONG", "I", "EM", "SMALL", "SPAN", "CODE", "U", "KBD", "BR", "A", "SUB", "SUP", "MARK"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CANVAS", "SVG", "svg", "IMG", "VIDEO", "INPUT", "SELECT"]);
  const ATTR = ["title", "placeholder", "aria-label"];
  const GESCHUETZT = "[data-kein-ue],#test-ergebnis,.wer,.betr,.av,.zeit,.betreff,.absender,.blatt,mark.fund,.tok,#ziel-adresse,.anhang-name,.sorte,#namen-auto,[data-weg]," +
    /* Die Kanon-Fenster (Siegel, Andock-Werkzeug, Verbinden, Fremdzugriff) sind byte-1:1 aus Sage und
       übersetzen sich selbst nach <html lang> — Deutsch und Englisch. Russisch kennt der Kanon nicht:
       dort stehen sie deutsch (benannte Grenze, wie in Private Brain). */
    "#sbkim-siegel-modal,#sbkim-rdv-panel,#sbkim-rdv-btn,#sbkim-membran-modal,[id^=sbkim-]";
  /* … und darin, was der app-eigene Klebstoff (sbkim-init.js) einhängt: das übersetzt diese Schicht. */
  const ERLAUBT = "[data-sp-ue],[data-abschirm-im-fenster],label[for=sbkim-geraetename],#sbkim-geraetename";

  const lies = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  let LANG = SPRACHEN.some((s) => s.code === lies(KEY)) ? lies(KEY) : "de";
  const fehlt = new Set(), fehltSatz = new Set();
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const texte = () => (window.SP_SPRACH_TEXTE || {})[LANG] || {};

  /* Das Wörterbuch (`sprache-texte.js`) wird nur geholt, wenn es gebraucht wird. Beim
     Laden der Seite steht es synchron vor dem Rumpf — dann gibt es keinen Augenblick, in
     dem die Seite deutsch dasteht und dann umspringt. */
  const TEXTE_URL = "assets/sprache-texte.js?v=1";
  if (LANG !== "de" && !window.SP_SPRACH_TEXTE && document.readyState === "loading") {
    document.write('<script src="' + TEXTE_URL + '"><\/script>');
  }
  function texteHolen() {
    return new Promise((ok) => {
      if (window.SP_SPRACH_TEXTE) return ok();
      const s = document.createElement("script");
      s.src = TEXTE_URL; s.onload = () => ok(); s.onerror = () => ok();
      document.head.appendChild(s);
    });
  }

  const MUSTER = {};
  function muster() {
    if (MUSTER[LANG]) return MUSTER[LANG];
    const out = [];
    for (const [k, v] of Object.entries(texte())) {
      if (!k.includes("{}")) continue;
      const teile = k.split("{}").map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      out.push({ re: new RegExp("^" + teile.join("([^<>]*?)") + "$"), v, n: k.length });
    }
    out.sort((a, b) => b.n - a.n);
    return (MUSTER[LANG] = out);
  }
  function einsetzen(v, caps) {
    if (typeof v === "function") return v(...caps);
    let i = 0;
    return v.replace(/\{(\d*)\}/g, (_, n) => { const c = n ? caps[+n - 1] : caps[i++]; return c == null ? "" : c; });
  }
  function nach(k, tief = 0) {
    if (!k) return null;
    const t = texte();
    if (Object.prototype.hasOwnProperty.call(t, k)) return typeof t[k] === "function" ? t[k]() : t[k];
    for (const m of muster()) {
      const r = m.re.exec(k);
      if (r) {
        const caps = r.slice(1).map((c) => { if (tief > 2 || !/\p{L}{2}/u.test(c)) return c; const x = nach(c.trim(), tief + 1); return x == null ? c : c.replace(c.trim(), x); });
        return einsetzen(m.v, caps);
      }
    }
    return null;
  }
  // Dateinamen, Kennungen, Adressen, eigene Aufgaben (★) sind keine Sätze.
  const keinSatz = (k) => /^★/.test(k) || (!/\s/.test(k) && (/\.[a-z0-9]{2,5}$/i.test(k) || /^[a-z0-9]+(-[a-z0-9]+)+$/.test(k) || /@|:\/\//.test(k)));
  function nachZeile(k) {
    const r = nach(k);
    if (r != null) return { r, fehlt: [] };
    if (!k.includes(" · ")) return { r: null, fehlt: [k] };
    const f = []; let eins = false;
    const teile = k.split(" · ").map((t) => {
      const x = t.trim(); if (!/\p{L}{2}/u.test(x) || keinSatz(x)) return t;
      const y = nach(x); if (y == null) { f.push(x); return t; } eins = true; return t.replace(x, y);
    });
    return { r: eins ? teile.join(" · ") : null, fehlt: eins ? f : [k] };
  }
  function T(deutsch) {
    if (LANG === "de") return deutsch;
    const k = norm(String(deutsch));
    if (!/\p{L}{2}/u.test(k) || keinSatz(k)) return deutsch;
    const z = nachZeile(k); z.fehlt.forEach((x) => fehlt.add(x));
    return z.r == null ? deutsch : z.r;
  }

  /* ---------- DOM ---------- */
  const ORIG = new WeakMap(), RICH = new WeakMap(), ATT = new WeakMap();
  let aus = false;
  const geschuetzt = (el) => {
    try {
      const g = el && el.closest && el.closest(GESCHUETZT); if (!g) return false;
      const a = el.closest(ERLAUBT); return !(a && g.contains(a));
    } catch (_) { return false; }
  };
  /* In der Fundliste steht der gefundene WERT als Text neben „Zeile 9: " — nur diese Angabe ist Oberfläche. */
  const nurZeile = (p, k) => p.matches("li[data-sorte]") && !/^Zeile \d+:$/.test(k);
  const ohneTags = (k) => k.replace(/<[^>]+>/g, " ");

  function skelett(el) {
    let s = "", inl = 0, ok = true;
    (function lauf(n) {
      for (const c of n.childNodes) {
        if (!ok) return;
        if (c.nodeType === 3) s += c.nodeValue;
        else if (c.nodeType === 1) {
          if (!INLINE.has(c.tagName) || c.id || [...c.attributes].some((a) => a.name.startsWith("data-") || a.name === "class")) { ok = false; return; }
          if (c.tagName === "SPAN" && c.children.length) { ok = false; return; }   // eine Reihe von Kärtchen, kein Satz
          inl++;
          const t = c.tagName.toLowerCase();
          if (t === "br") { s += "<br>"; continue; }
          s += "<" + t + ">"; lauf(c); s += "</" + t + ">";
        }
      }
    })(el);
    return ok && inl ? norm(s) : null;
  }
  function aufbauen(el, wert, vorlage) {
    const pools = {};
    (function sammle(n) { for (const c of n.childNodes) if (c.nodeType === 1) { const t = c.tagName.toLowerCase(); (pools[t] = pools[t] || []).push(c); sammle(c); } })(vorlage);
    const frag = document.createDocumentFragment(), stapel = [frag];
    for (const tok of String(wert).split(/(<\/?[a-z]+>)/)) {
      if (!tok) continue;
      const m = /^<(\/?)([a-z]+)>$/.exec(tok), oben = stapel[stapel.length - 1];
      if (!m) { oben.appendChild(document.createTextNode(tok)); continue; }
      if (m[1]) { if (stapel.length > 1) stapel.pop(); continue; }
      const p = (pools[m[2]] || []).shift();
      const neu = p ? p.cloneNode(false) : document.createElement(m[2]);
      oben.appendChild(neu);
      if (m[2] !== "br") stapel.push(neu);
    }
    el.replaceChildren(frag);
  }
  function richElement(el) {
    let info = RICH.get(el);
    if (info && skelett(el) !== info.t) info = null;
    if (!info) {
      const k = skelett(el);
      if (!k || !/\p{L}{2}/u.test(ohneTags(k))) return false;
      if (LANG === "de") return false;
      info = { key: k, vorlage: el.cloneNode(true), t: k };
      RICH.set(el, info);
    }
    if (LANG === "de") { if (info.t !== info.key) { aufbauen(el, info.key, info.vorlage); info.t = info.key; } return true; }
    const r = nach(info.key);
    if (r == null) {
      fehltSatz.add(info.key);
      if (info.t !== info.key) { aufbauen(el, info.key, info.vorlage); info.t = info.key; }
      RICH.delete(el);
      return false;
    }
    if (info.t !== norm(r)) { aufbauen(el, r, info.vorlage); info.t = skelett(el) || norm(r); }
    return true;
  }
  function textKnoten(n) {
    let info = ORIG.get(n);
    if (!info || n.nodeValue !== info.t) { info = { o: n.nodeValue, t: n.nodeValue }; ORIG.set(n, info); }
    const k = norm(info.o);
    if (!/\p{L}{2}/u.test(k) || keinSatz(k) || (n.parentElement && nurZeile(n.parentElement, k))) return;
    let neu = info.o;
    if (LANG !== "de") {
      const z = nachZeile(k); z.fehlt.forEach((x) => fehlt.add(x));
      if (z.r != null) { const m = /^(\s*)[\s\S]*?(\s*)$/.exec(info.o); neu = m[1] + z.r + m[2]; }
    }
    if (n.nodeValue !== neu) n.nodeValue = neu;
    info.t = neu;
  }
  function attribute(el) {
    let m = ATT.get(el);
    if (!m) { m = {}; ATT.set(el, m); }
    for (const a of ATTR) {
      const cur = el.getAttribute(a);
      if (cur == null) { delete m[a]; continue; }
      let i = m[a];
      if (!i || (cur !== i.t && cur !== i.o)) i = m[a] = { o: cur, t: cur };
      let neu = i.o;
      if (LANG !== "de" && /\p{L}{2}/u.test(i.o)) { const z = nachZeile(norm(i.o)); z.fehlt.forEach((x) => fehlt.add(x)); if (z.r != null) neu = z.r; }
      i.t = neu;
      if (el.getAttribute(a) !== neu) el.setAttribute(a, neu);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { const p = root.parentElement; if (p && !SKIP.has(p.tagName) && !geschuetzt(p)) { if (!(RICH.has(p) && richElement(p))) textKnoten(root); } return; }
    if (root.nodeType !== 1) return;
    if (geschuetzt(root)) { if (root.querySelectorAll) for (const e of root.querySelectorAll(ERLAUBT)) if (!geschuetzt(e)) walk(e); return; }
    if (SKIP.has(root.tagName)) { attribute(root); return; }
    const stapel = [root];
    while (stapel.length) {
      const el = stapel.pop();
      if (el.matches && el.matches(GESCHUETZT) && geschuetzt(el)) { for (const e of el.querySelectorAll(ERLAUBT)) if (!geschuetzt(e)) walk(e); continue; }
      attribute(el);
      if (SKIP.has(el.tagName)) continue;
      if (richElement(el)) { for (const c of el.querySelectorAll("*")) attribute(c); continue; }
      for (const c of el.childNodes) {
        if (c.nodeType === 3) textKnoten(c);
        else if (c.nodeType === 1) stapel.push(c);
      }
    }
  }

  function anwenden() {
    document.documentElement.lang = LANG;
    aus = true;
    try {
      walk(document.body);
      const ti = document.querySelector("title");
      if (ti) walk(ti.firstChild);
      knopfBeschriften();
    } finally { aus = false; beob.takeRecords(); }
  }
  const beob = new MutationObserver((recs) => {
    if (aus) return;
    aus = true;
    try {
      const gesehen = new Set();
      for (const r of recs) {
        const z = r.target;
        if (r.type === "childList") {
          if (z.nodeType === 1 && RICH.has(z)) { if (!gesehen.has(z)) { gesehen.add(z); walk(z); } continue; }
          for (const n of r.addedNodes) if (!gesehen.has(n)) { gesehen.add(n); walk(n); }
          continue;
        }
        if (r.type === "characterData") {
          const p = z.parentElement;
          if (p && RICH.has(p)) { if (!gesehen.has(p)) { gesehen.add(p); walk(p); } } else walk(z);
          continue;
        }
        if (r.type === "attributes" && z.nodeType === 1 && !geschuetzt(z)) attribute(z);
      }
    } finally { aus = false; beob.takeRecords(); }
  });

  /* ---------- Rückfragen der Seite ----------
     `confirm`/`alert` zeigt der Browser selbst, dort greift kein Beobachter. Zeile für
     Zeile nachschlagen; was dahinter steht (ein Betreff), bleibt, wie es ist. */
  const zeilen = (s) => String(s).split("\n").map((z) => (z.trim() ? T(z) : z)).join("\n");
  const altConfirm = window.confirm.bind(window), altAlert = window.alert.bind(window);
  window.confirm = (s) => altConfirm(zeilen(s));
  window.alert = (s) => altAlert(zeilen(s));
  const altPrompt = window.prompt.bind(window);
  window.prompt = (s, d) => altPrompt(zeilen(s), d);

  /* ---------- Sprachriegel (wie im Auslieferungsprüfer) ----------
     Wer nicht gewählt hat, dem darf der Browser übersetzen. Wer gewählt hat, bekommt die
     App — in BEIDEN Richtungen: auch gewähltes Deutsch wird nicht von Chrome übersetzt. */
  const hatGewaehlt = () => lies(KEY_WAHL) === "1";
  function sperren() {
    const h = document.documentElement;
    h.setAttribute("translate", "no"); h.classList.add("notranslate");
    if (!document.querySelector('meta[name="google"][content="notranslate"]')) {
      const m = document.createElement("meta"); m.name = "google"; m.content = "notranslate";
      (document.head || h).appendChild(m);
    }
  }
  if (hatGewaehlt()) sperren();
  const googleHatUebersetzt = () => /(^|\s)translated-(ltr|rtl)(\s|$)/.test(document.documentElement.className || "");

  function setzen(code, gewaehlt) {
    if (!SPRACHEN.some((s) => s.code === code)) return Promise.resolve();
    LANG = code; schreib(KEY, code);
    if (gewaehlt !== false) { schreib(KEY_WAHL, "1"); sperren(); }
    return (code === "de" ? Promise.resolve() : texteHolen()).then(() => {
      anwenden();
      document.dispatchEvent(new CustomEvent("sp-sprache", { detail: code }));
      if (googleHatUebersetzt()) { try { location.reload(); } catch (_) {} }
    });
  }

  /* ---------- Die Wahl: ein Knopf in der Kopfleiste, eine Reihe im Menü ----------
     Der Knopf nennt die AKTUELLE Sprache und schaltet weiter (DE → EN → RU). Am Handy
     ist in der Kopfleiste kein Platz — dort steht die Wahl nur im Menü (⚙). */
  function knopfBeschriften() {
    const s = SPRACHEN.find((x) => x.code === LANG);
    const k = document.getElementById("sprache");
    if (k) {
      k.textContent = s.kurz;
      k.setAttribute("data-kein-ue", "");
      k.setAttribute("aria-label", ({ de: "Sprache: Deutsch — tippen für Englisch", en: "Language: English — tap for Russian", ru: "Язык: русский — нажмите для немецкого" })[LANG]);
      k.setAttribute("title", "Sprache · Language · Язык");
    }
    document.querySelectorAll("[data-sprache-wahl]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-sprache-wahl") === LANG)));
  }
  function einbauen() {
    if (!document.getElementById("sprache")) {
      const hilfe = document.getElementById("hilfe");
      if (hilfe) {
        const k = document.createElement("button");
        k.className = "rund"; k.id = "sprache"; k.type = "button";
        k.addEventListener("click", () => { const i = SPRACHEN.findIndex((x) => x.code === LANG); setzen(SPRACHEN[(i + 1) % SPRACHEN.length].code); });
        hilfe.parentNode.insertBefore(k, hilfe);
      }
    }
    const tm = document.getElementById("thema-menue");
    if (tm && !document.querySelector("[data-sprache-reihe]")) {
      const r = document.createElement("div");
      r.className = "werkzeug"; r.setAttribute("data-sprache-reihe", ""); r.setAttribute("data-kein-ue", "");
      r.setAttribute("role", "group"); r.setAttribute("aria-label", "Sprache · Language · Язык");
      for (const s of SPRACHEN) {
        const b = document.createElement("button");
        b.className = "knopf"; b.type = "button"; b.setAttribute("data-sprache-wahl", s.code); b.lang = s.code;
        b.textContent = s.name;
        b.addEventListener("click", () => setzen(s.code));
        r.appendChild(b);
      }
      const tw = tm.closest(".werkzeug") || tm;
      tw.parentNode.insertBefore(r, tw);
    }
    if (!document.getElementById("sp-sprache-stil")) {
      const st = document.createElement("style");
      st.id = "sp-sprache-stil";
      st.textContent = "#sprache{font:600 .8rem/1 system-ui,sans-serif;letter-spacing:.02em}@media (max-width:700px){#sprache{display:none}}[data-sprache-reihe] [aria-pressed=true]{outline:2px solid currentColor;outline-offset:1px}";
      document.head.appendChild(st);
    }
  }

  function start() {
    einbauen();
    anwenden();
    beob.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  window.SPSprache = {
    SPRACHEN, T, fehlt, fehltSatz, setzen, anwenden, hatGewaehlt,
    schluessel: { sprache: KEY, wahl: KEY_WAHL },
    get lang() { return LANG; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

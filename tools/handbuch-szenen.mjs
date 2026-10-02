/* Sende-Prüfer — die Szenen des Handbuchs (Klaus 2026-09-29).
 *
 * EINE Liste für Handbuch UND späteres Video: jede Szene hat einen Titel, einen
 * Lesetext (was man sieht und warum), einen SPRECHTEXT (kurz, gesprochen, fürs
 * Video und für „▶ Vorführen“), einen Aufbau im echten Browser und ein Ziel, um
 * das der Leuchtring gelegt wird. `tools/handbuch-bauen.mjs` nimmt daraus die
 * Bildschirmfotos auf und schreibt `handbuch.html` und `handbuch/szenen.json`.
 *
 * Wer die Oberfläche ändert, baut das Handbuch neu — sonst zeigen die Bilder
 * eine App, die es nicht mehr gibt.
 */
const breit = { width: 1280, height: 800 };
const handy = { width: 390, height: 844 };

async function beispiel(p) {
  await p.click("#menue");
  await p.click("#beispiel");
  await p.waitForFunction(() => /Rechnung RE-2026/.test((document.querySelector("h1.betreff") || {}).textContent || ""));
}

export const SZENEN = [
  {
    id: "postfach", titel: "Das Postfach",
    text: "Links die vier Ordner: <b>Eingefügt</b> (empfangene Mails), <b>Entwürfe</b>, <b>KI-Antworten</b> und <b>Exportiert</b>. In der Mitte die Liste, rechts die gewählte Mail. Jede Zeile trägt eine Zahl: so viele Angaben werden vor dem Weg zur KI verdeckt. Alles liegt im Speicher dieses Browsers, nicht auf einem Server.",
    sprech: "Das ist Ihr Postfach im Browser. Vier Ordner, eine Liste, rechts die Mail. Die Zahl an jeder Zeile sagt, wie viele Angaben geschützt werden. Nichts davon liegt auf einem Server.",
    sprechText: { en: "This is your mailbox in the browser. Four folders, a list, and the mail on the right. The number on each line tells you how many details will be protected. None of it is stored on a server." },
    ansicht: breit, ziel: "nav.ordner",
    aufbau: async () => {},
  },
  {
    id: "einfuegen", titel: "Eine Mail hereinholen",
    text: "<b>📥 Mail einfügen</b> nimmt eine empfangene Mail auf: aus der Zwischenablage, als Text oder als gespeicherte <b>.eml</b>-Datei. Kopfzeilen (Von, An, Betreff) werden erkannt, auch kodierte. Die Mail landet in „Eingefügt“ und bleibt auf diesem Gerät.",
    sprech: "Eine Mail holen Sie mit Mail einfügen herein: aus der Zwischenablage oder als gespeicherte Datei. Von, An und Betreff erkennt der Sende-Prüfer selbst.",
    sprechText: { en: "To bring in a mail, use Paste mail: from the clipboard or as a saved file. The Send Checker recognises From, To and Subject by itself." },
    ansicht: breit, ziel: "#einfuegen-dialog",
    aufbau: async (p) => { await p.click("#einfuegen"); await p.waitForSelector("#einfuegen-dialog[open]"); },
  },
  {
    id: "original", titel: "Die Mail, wie sie ist",
    text: "Die Beispiel-Mail aus dem Menü (⚙ → Beispiel-E-Mail laden) ist erfunden und zeigt den ganzen Weg: Namen, eine Firma, Mailadressen, eine Rechnungsnummer, einen Betrag und eine Kontonummer. So sieht <b>Ihr</b> Text aus — in der Ansicht „Original“.",
    sprech: "Hier eine erfundene Mail mit allem, was nicht zur KI soll: Namen, Adressen, Rechnungsnummer, Betrag und Kontonummer.",
    sprechText: { en: "Here is an invented mail with everything that should not go to the AI: names, addresses, invoice number, amount and account number." },
    ansicht: breit, ziel: "main.lesen .blatt",
    aufbau: async (p) => { await beispiel(p); },
  },
  {
    id: "ki-sicht", titel: "Was die KI sieht",
    text: "Ein Tipp auf <b>Was die KI sieht</b> zeigt genau den Text, der hinausgehen würde. Jede Angabe ist durch einen Platzhalter ersetzt, etwa <code>⟦NAME-1⟧</code> oder <code>⟦BETRAG-1⟧</code>. Dieselbe Angabe bekommt immer denselben Platzhalter, damit die KI den Sinn behält.",
    sprech: "Mit Was die KI sieht erscheint der Text, der wirklich hinausgeht. Jede Angabe ist ein Platzhalter. Dieselbe Angabe hat immer denselben.",
    sprechText: { en: "With What the AI sees, you get the text that really goes out. Every detail is a placeholder. The same detail always gets the same one." },
    ansicht: breit, ziel: "#verdeckt",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); await p.waitForSelector("#verdeckt"); },
  },
  {
    id: "namen", titel: "Namen, die kein Muster findet",
    text: "Mailadressen, Nummern und Beträge erkennt der Prüfer an ihrer Form. <b>Namen nicht</b> — „Müller“ sieht aus wie jedes andere Wort. Deshalb werden die Namen aus Von und An übernommen, und unter <b>Weitere Namen</b> tragen Sie ein, was sonst noch verdeckt werden soll: eine Firma, ein Kollege, ein Ort.",
    sprech: "Namen erkennt kein Muster. Die Namen aus Von und An nimmt der Sende-Prüfer selbst, weitere tragen Sie hier ein.",
    sprechText: { en: "No pattern can recognise names. The Send Checker takes the names from From and To by itself; you enter any others here." },
    ansicht: breit, ziel: ".namen",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "aufgaben", titel: "Was soll die KI tun?",
    text: "Unter <b>Was soll die KI tun?</b> eine Aufgabe antippen — <b>Antwort</b>, <b>Rechnung</b>, <b>Mahnung</b>, <b>Angebot</b>, <b>Auftragsbestätigung</b>, <b>Termin</b> — oder selbst eintragen und <b>Anweisung bauen</b>. Daraus entsteht die ganze Anweisung: Platzhalter bleiben, nichts wird erfunden, Fehlendes wird als [bitte ergänzen] markiert. <b>Als Knopf merken</b> legt eigene Aufgaben als Knopf an. Auch die Anweisung geht nur verdeckt hinaus.",
    sprech: "Was soll die KI tun? Eine Aufgabe antippen, etwa Rechnung oder Mahnung, oder selbst eintragen. Daraus entsteht die ganze Anweisung. Eigene Aufgaben lassen sich als Knopf merken.",
    sprechText: { en: "What should the AI do? Tap a task, such as invoice or reminder, or write your own. The full instruction is built from it. Your own tasks can be saved as a button." },
    ansicht: breit, ziel: "#s-ki > div:first-of-type",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-aufgabe="🧾 Rechnung"]'); },
  },
  {
    id: "wege", titel: "Zwei Wege hinaus",
    text: "<b>Kopieren</b> für Ihr eigenes KI-Abo: in ChatGPT, Claude oder Le Chat einfügen, ohne Schlüssel und ohne zusätzliche Kosten. <b>Senden</b> geht direkt an Claude, ChatGPT, Gemini, OpenRouter oder Mistral, mit Ihrem eigenen Schlüssel — es kostet, was Ihr Schlüssel kostet. Beide Wege sind gleichrangig; hinaus geht nur der verdeckte Text, und nur auf Knopfdruck.",
    sprech: "Zwei Wege, beide gleichwertig: kopieren für Ihr eigenes KI-Abo, oder direkt senden mit Ihrem Schlüssel. Hinaus geht nur der geschützte Text, und nur, wenn Sie tippen.",
    sprechText: { en: "Two ways, both equally good: copy it for your own AI subscription, or send it directly with your key. Only the protected text goes out, and only when you tap." },
    ansicht: breit, ziel: ".zwei",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "antwort", titel: "Die Antwort kommt mit Klartext zurück",
    text: "Die Antwort der KI enthält die Platzhalter. Eingefügt (oder direkt empfangen) setzt der Sende-Prüfer die echten Angaben wieder ein — hier steht dann wieder „Frau Beispiel“ und „1.248,50 EUR“. Ablegen, als .eml speichern oder teilen geht von hier aus.",
    sprech: "Die Antwort der KI kommt mit Platzhaltern zurück. Der Sende-Prüfer setzt die echten Angaben wieder ein, und Sie können sie ablegen, speichern oder teilen.",
    sprechText: { en: "The AI's answer comes back with placeholders. The Send Checker puts the real details back in, and you can file, save or share it." },
    ansicht: breit, ziel: "#antwort-klar",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "abschirmen", titel: "Abschirmen",
    text: "<b>🛡 Abschirmen</b> hält Schreib-Helfer wie Grammarly oder LanguageTool und die KI-Schreibhilfe des Browsers von den Schreibfeldern fern. Hängt etwas Fremdes Elemente in die Seite, erscheint oben ein roter Hinweis und die Lampe <b>fremd</b> leuchtet. Das ist eine Bitte an die Erweiterungen, kein Riegel — Programme, die den Bildschirm mitlesen, sieht keine Webseite.",
    sprech: "Abschirmen hält Schreib-Helfer und die KI-Schreibhilfe des Browsers aus den Feldern heraus. Liest etwas Fremdes mit, leuchtet die Lampe fremd.",
    sprechText: { en: "Shield keeps writing helpers and the browser's AI writing assistant out of the fields. If something foreign reads along, the foreign lamp lights up." },
    ansicht: breit, ziel: "#schild",
    aufbau: async (p) => { await p.click("#schild"); },
  },
  {
    id: "knoten", titel: "Ein eigener Knoten im Netz",
    text: "Oben neben dem Namen die <b>Netz-Leiste</b>: drei Lampen (<b>lebt</b> · <b>verkehr</b> · <b>fremd</b>), das <b>Siegel</b> und die <b>Mycel-Blase</b>. Der Sende-Prüfer ist ein Knoten im SBKIM-Netz mit eigener Kennung. Mit dem Netz verbindet er sich nur, wenn Sie in der Mycel-Blase darauf tippen — und dann geht nur seine Visitenkarte hinaus, keine Mail.",
    sprech: "Oben die Netz-Leiste: drei Lampen, das Siegel und die Mycel-Blase. Der Sende-Prüfer ist ein eigener Knoten. Ins Netz geht er nur, wenn Sie es wollen, und nie mit Ihren Mails.",
    sprechText: { en: "At the top is the network bar: three lamps, the seal and the mycel bubble. The Send Checker is a node of its own. It only goes online when you want it to, and never with your mails." },
    ansicht: breit, ziel: "#netzleiste",
    aufbau: async (p) => { await p.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 15000 }).catch(() => {}); },
  },
  {
    id: "handy", titel: "Am Handy",
    text: "Am Handy stehen oben nur die drei Lampen. Ein Tipp klappt Namen, Siegel und Mycel-Blase darunter auf, ein Tipp daneben schließt wieder. Die Ordner liegen unten, <b>✎ Verfassen</b> schwebt rechts unten.",
    sprech: "Am Handy zeigen oben drei Punkte den Zustand. Ein Tipp klappt Siegel und Netz auf. Die Ordner liegen unten.",
    sprechText: { en: "On a phone, three dots at the top show the status. One tap opens the seal and the network. The folders are at the bottom." },
    ansicht: handy, ziel: "#netzleiste",
    aufbau: async (p) => { await p.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 15000 }).catch(() => {}); await p.click("#lampen"); },
  },
  {
    id: "selbsttest", titel: "Der Selbsttest",
    text: "Im Menü (⚙) prüft der <b>Selbsttest</b> den Prüfer an einem Köder: jede Sorte steht dort genau einmal, dazu Zeilen, die nicht gemeldet werden dürfen. So sehen Sie selbst, dass er erkennt, was er verspricht — ohne eigene Daten.",
    sprech: "Der Selbsttest im Menü prüft den Prüfer an einem Köder. So sehen Sie selbst, dass er hält, was er verspricht.",
    sprechText: { en: "The self-test in the menu checks the checker against a decoy. That way you can see for yourself that it keeps its promises." },
    ansicht: breit, ziel: "#selbsttest",
    aufbau: async (p) => {
      await p.click("#menue"); await p.click("#selbsttest summary"); await p.click("#test-start");
      await p.waitForFunction(() => /bestanden|nicht bestanden/.test(document.getElementById("test-summe").textContent), null, { timeout: 15000 }).catch(() => {});
    },
  },
];

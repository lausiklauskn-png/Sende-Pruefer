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
    sprech: "Das ist Ihr Postfach im Browser. Vier Ordner, eine Liste – und rechts die Mail. Die Zahl an jeder Zeile zeigt, wie viele Angaben geschützt werden. Nichts davon liegt auf einem Server.",
    sprechText: { en: "This is your mailbox – right in your browser. Four folders, a message list, and the email on the right. The number on each line shows how many details are protected. Nothing is stored on a server.", ru: "Это ваш почтовый ящик — прямо в браузере. Четыре папки, список писем, а справа — само письмо. Число в каждой строке показывает, сколько данных защищено. Ничего не хранится на сервере." },
    ansicht: breit, ziel: "nav.ordner",
    aufbau: async () => {},
  },
  {
    id: "einfuegen", titel: "Eine Mail hereinholen",
    text: "<b>📥 Mail einfügen</b> nimmt eine empfangene Mail auf: aus der Zwischenablage, als Text oder als gespeicherte <b>.eml</b>-Datei. Kopfzeilen (Von, An, Betreff) werden erkannt, auch kodierte. Die Mail landet in „Eingefügt“ und bleibt auf diesem Gerät.",
    sprech: "Eine Mail holen Sie mit „Mail einfügen“ herein: aus der Zwischenablage oder als gespeicherte Datei. Von, An und Betreff erkennt der Sende-Prüfer selbst.",
    sprechText: { en: "To add an email, select “Paste Email”. You can paste it from the clipboard or open a saved file. The Send Checker automatically recognizes From, To, and Subject.", ru: "Чтобы добавить письмо, нажмите «Вставить письмо». Его можно вставить из буфера обмена или открыть из сохранённого файла. Поля «От кого», «Кому» и «Тема» Sende-Prüfer распознаёт автоматически." },
    ansicht: breit, ziel: "#einfuegen-dialog",
    aufbau: async (p) => { await p.click("#einfuegen"); await p.waitForSelector("#einfuegen-dialog[open]"); },
  },
  {
    id: "original", titel: "Die Mail, wie sie ist",
    text: "Die Beispiel-Mail aus dem Menü (⚙ → Beispiel-E-Mail laden) ist erfunden und zeigt den ganzen Weg: Namen, eine Firma, Mailadressen, eine Rechnungsnummer, einen Betrag und eine Kontonummer. So sieht <b>Ihr</b> Text aus — in der Ansicht „Original“.",
    sprech: "Hier sehen Sie eine erfundene Mail mit allem, was nicht zur KI soll: Namen, Adressen, Rechnungsnummer, Betrag und Kontonummer.",
    sprechText: { en: "Here’s a sample email containing information that should stay private: names, addresses, an invoice number, an amount, and bank details.", ru: "Перед вами пример письма с данными, которые не должны передаваться ИИ: имена, адреса, номер счёта, сумма и банковские реквизиты." },
    ansicht: breit, ziel: "main.lesen .blatt",
    aufbau: async (p) => { await beispiel(p); },
  },
  {
    id: "ki-sicht", titel: "Was die KI sieht",
    text: "Ein Tipp auf <b>Was die KI sieht</b> zeigt genau den Text, der hinausgehen würde. Jede Angabe ist durch einen Platzhalter ersetzt, etwa <code>⟦NAME-1⟧</code> oder <code>⟦BETRAG-1⟧</code>. Dieselbe Angabe bekommt immer denselben Platzhalter, damit die KI den Sinn behält.",
    sprech: "Mit „Was die KI sieht“ erscheint genau der Text, der hinausgeht. Geschützte Angaben werden durch Platzhalter ersetzt. Dieselbe Angabe bekommt immer denselben Platzhalter.",
    sprechText: { en: "Select “What the AI sees”. Now you see exactly what will be sent. Private information is replaced with placeholders. The same information always gets the same placeholder.", ru: "Нажмите «Что видит ИИ». Теперь вы видите именно тот текст, который будет отправлен. Конфиденциальные данные заменяются заполнителями. Одинаковые данные всегда получают одинаковый заполнитель." },
    ansicht: breit, ziel: "#verdeckt",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); await p.waitForSelector("#verdeckt"); },
  },
  {
    id: "namen", titel: "Namen, die kein Muster findet",
    text: "Mailadressen, Nummern und Beträge erkennt der Prüfer an ihrer Form. <b>Namen nicht</b> — „Müller“ sieht aus wie jedes andere Wort. Deshalb werden die Namen aus Von und An übernommen, und unter <b>Weitere Namen</b> tragen Sie ein, was sonst noch verdeckt werden soll: eine Firma, ein Kollege, ein Ort.",
    sprech: "Die Namen aus Von und An übernimmt der Sende-Prüfer selbst. Weitere Namen tragen Sie hier ein.",
    sprechText: { en: "Names from From and To are detected automatically. You can add more names here.", ru: "Имена из полей «От кого» и «Кому» определяются автоматически. Другие имена можно добавить здесь." },
    ansicht: breit, ziel: ".namen",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "aufgaben", titel: "Was soll die KI tun?",
    text: "Unter <b>Was soll die KI tun?</b> eine Aufgabe antippen — <b>Antwort</b>, <b>Rechnung</b>, <b>Mahnung</b>, <b>Angebot</b>, <b>Auftragsbestätigung</b>, <b>Termin</b> — oder selbst eintragen und <b>Anweisung bauen</b>. Daraus entsteht die ganze Anweisung: Platzhalter bleiben, nichts wird erfunden, Fehlendes wird als [bitte ergänzen] markiert. <b>Als Knopf merken</b> legt eigene Aufgaben als Knopf an. Auch die Anweisung geht nur verdeckt hinaus.",
    sprech: "Was soll die KI tun? Wählen Sie eine Aufgabe, etwa Rechnung oder Mahnung, oder tragen Sie selbst eine ein. Daraus entsteht die vollständige Anweisung. Eigene Aufgaben lassen sich speichern.",
    sprechText: { en: "What should the AI do? Choose a task, like checking an invoice or payment reminder, or enter your own. The Send Checker creates the full instruction for you. You can also save your own tasks.", ru: "Что должен сделать ИИ? Выберите задачу — например, обработать счёт или напоминание об оплате. Или введите свою. Sende-Prüfer сам создаст полную инструкцию. Свои задачи можно сохранить." },
    ansicht: breit, ziel: "#s-ki > div:first-of-type",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-aufgabe="🧾 Rechnung"]'); },
  },
  {
    id: "wege", titel: "Zwei Wege hinaus",
    text: "<b>Kopieren</b> für Ihr eigenes KI-Abo: in ChatGPT, Claude oder Le Chat einfügen, ohne Schlüssel und ohne zusätzliche Kosten. <b>Senden</b> geht direkt an Claude, ChatGPT, Gemini, OpenRouter oder Mistral, mit Ihrem eigenen Schlüssel — es kostet, was Ihr Schlüssel kostet. Beide Wege sind gleichrangig; hinaus geht nur der verdeckte Text, und nur auf Knopfdruck.",
    sprech: "Jetzt haben Sie zwei Wege: den geschützten Text kopieren und Ihr eigenes KI-Abo nutzen – oder direkt mit Ihrem Schlüssel senden. Hinaus geht nur der geschützte Text und nur, wenn Sie es auslösen.",
    sprechText: { en: "Now choose how to continue. Copy the protected text and use your own AI subscription – or send it directly with your own key. Only the protected text leaves your device. And only when you choose to send it.", ru: "Теперь выберите способ отправки. Скопируйте защищённый текст и используйте свою подписку на ИИ — или отправьте его напрямую с помощью собственного ключа. С устройства уходит только защищённый текст. И только тогда, когда вы сами запускаете отправку." },
    ansicht: breit, ziel: ".zwei",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "antwort", titel: "Die Antwort kommt mit Klartext zurück",
    text: "Die Antwort der KI enthält die Platzhalter. Eingefügt (oder direkt empfangen) setzt der Sende-Prüfer die echten Angaben wieder ein — hier steht dann wieder „Frau Beispiel“ und „1.248,50 EUR“. Ablegen, als .eml speichern oder teilen geht von hier aus.",
    sprech: "Die Antwort der KI kommt mit Platzhaltern zurück. Der Sende-Prüfer setzt die echten Angaben wieder ein. Danach können Sie die Antwort ablegen, speichern oder teilen.",
    sprechText: { en: "The AI response comes back with the placeholders intact. The Send Checker restores the original information. Then you can file, save, or share the result.", ru: "Ответ ИИ возвращается с теми же заполнителями. Sende-Prüfer восстанавливает исходные данные. После этого результат можно сохранить, отправить или поместить в нужную папку." },
    ansicht: breit, ziel: "#antwort-klar",
    aufbau: async (p) => { await beispiel(p); await p.click('[data-sicht="ki"]'); },
  },
  {
    id: "abschirmen", titel: "Abschirmen",
    text: "<b>🛡 Abschirmen</b> hält Schreib-Helfer wie Grammarly oder LanguageTool und die KI-Schreibhilfe des Browsers von den Schreibfeldern fern. Hängt etwas Fremdes Elemente in die Seite, erscheint oben ein roter Hinweis und die Lampe <b>fremd</b> leuchtet. Das ist eine Bitte an die Erweiterungen, kein Riegel — Programme, die den Bildschirm mitlesen, sieht keine Webseite.",
    sprech: "„Abschirmen“ hält Schreibhelfer aus den Feldern heraus. Versucht etwas Fremdes mitzulesen, leuchtet die Lampe „Fremd“.",
    sprechText: { en: "“Shield” keeps writing assistants out of your fields. If something else tries to read along, the “External” light turns on.", ru: "Функция «Защита» не позволяет помощникам по письму читать содержимое полей. Если что-то постороннее пытается получить доступ, загорается индикатор «Посторонний»." },
    ansicht: breit, ziel: "#schild",
    aufbau: async (p) => { await p.click("#schild"); },
  },
  {
    id: "knoten", titel: "Ein eigener Knoten im Netz",
    text: "Oben neben dem Namen die <b>Netz-Leiste</b>: drei Lampen (<b>lebt</b> · <b>verkehr</b> · <b>fremd</b>), das <b>Siegel</b> und die <b>Mycel-Blase</b>. Der Sende-Prüfer ist ein Knoten im SBKIM-Netz mit eigener Kennung. Mit dem Netz verbindet er sich nur, wenn Sie in der Mycel-Blase darauf tippen — und dann geht nur seine Visitenkarte hinaus, keine Mail.",
    sprech: "Oben sehen Sie die Netz-Leiste mit drei Lampen, Siegel und Mycel-Blase. Ins Netz geht der Sende-Prüfer nur, wenn Sie es wollen – niemals mit Ihren Mails.",
    sprechText: { en: "At the top is the network bar, with three lights, the seal, and the Mycel bubble. The Send Checker connects only when you want it to – and never with your emails.", ru: "Вверху находится сетевая панель: три индикатора, печать и значок Mycel. Sende-Prüfer подключается к сети только по вашему желанию — и никогда не передаёт туда ваши письма." },
    ansicht: breit, ziel: "#netzleiste",
    aufbau: async (p) => { await p.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 15000 }).catch(() => {}); },
  },
  {
    id: "handy", titel: "Am Handy",
    text: "Am Handy stehen oben nur die drei Lampen. Ein Tipp klappt Namen, Siegel und Mycel-Blase darunter auf, ein Tipp daneben schließt wieder. Die Ordner liegen unten, <b>✎ Verfassen</b> schwebt rechts unten.",
    sprech: "Am Handy zeigen drei Punkte den Zustand. Ein Tipp öffnet Siegel und Netz. Die Ordner liegen unten.",
    sprechText: { en: "On mobile, three dots show the current status. Tap them to open the seal and network controls. Your folders are at the bottom.", ru: "На телефоне три точки показывают текущее состояние. Нажмите на них, чтобы открыть настройки печати и сети. Папки находятся внизу." },
    ansicht: handy, ziel: "#netzleiste",
    aufbau: async (p) => { await p.waitForFunction(() => window.SP_KNOTEN_BEREIT === true, null, { timeout: 15000 }).catch(() => {}); await p.click("#lampen"); },
  },
  {
    id: "selbsttest", titel: "Der Selbsttest",
    text: "Im Menü (⚙) prüft der <b>Selbsttest</b> den Prüfer an einem Köder: jede Sorte steht dort genau einmal, dazu Zeilen, die nicht gemeldet werden dürfen. So sehen Sie selbst, dass er erkennt, was er verspricht — ohne eigene Daten.",
    sprech: "Der Selbsttest prüft den Sende-Prüfer mit einem Köder. So sehen Sie selbst, ob er hält, was er verspricht.",
    sprechText: { en: "The self-test uses a decoy to check the Send Checker. So you can see for yourself that it does exactly what it promises.", ru: "Самотест проверяет Sende-Prüfer с помощью приманки. Так вы сами можете убедиться, что он выполняет именно то, что обещает." },
    ansicht: breit, ziel: "#selbsttest",
    aufbau: async (p) => {
      await p.click("#menue"); await p.click("#selbsttest summary"); await p.click("#test-start");
      await p.waitForFunction(() => /bestanden|nicht bestanden/.test(document.getElementById("test-summe").textContent), null, { timeout: 15000 }).catch(() => {});
    },
  },
];

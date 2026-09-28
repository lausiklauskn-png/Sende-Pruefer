/*
 * Siegel-Inhalt — DIE IDENTITÄT DIESES KNOTENS, und sonst nichts.
 *
 * Der Andock-Wizard selbst liegt byte-1:1 aus Sage in
 * `modules/16b_andock_wizard.js` und liest nur `window.SBKIM_SIEGEL_WIZ`.
 * Diese Datei wird NIE verteilt: sie trägt die Bedeutung des Knotens, und ein
 * Überschreiben gäbe ihm Namen und Vektor einer fremden App (Alis Moderaum,
 * 2026-08-16). Vertrag: Sage-Protokol/docs/INTERFACES.md §11.9.
 *
 * ⚠ DIE BESCHREIBUNG IST KEINE ZIERDE. Modul 03 rechnet daraus den
 * Domänen-Vektor. Das Wichtigste steht vorn (Name, Zweck, Protokoll) — Modul 03
 * schneidet bei 512 Tokens ab, und wer kürzen muss, kürzt von hinten.
 */
(function () {
  "use strict";
  window.SBKIM_SIEGEL_WIZ = {
    domain: "E-Mail/Datenschutz/Werkzeug",
    endpoint: "https://lausiklauskn-png.github.io/Sende-Pruefer/",
    nodeType: "hybrid",
    nodeName: "Sende-Prüfer",
    domainDescription: "Der Sende-Prüfer ist ein Werkzeug im SBKIM-Mycel und ein eigener Knoten. ZWECK: eine E-Mail mit Hilfe einer KI beantworten oder überarbeiten, ohne dass Namen, Mailadressen, Telefonnummern, Kontonummern, Beträge, Rechnungsnummern oder Zugangsschlüssel an die KI gehen. Die Seite prüft den Text, BEVOR er hinausgeht, ersetzt jede gefundene Angabe durch einen Platzhalter und setzt in der Antwort der KI die echten Angaben wieder ein. FORSCHUNG UND PROTOKOLL: der Sende-Prüfer gehört zum SBKIM-Protokoll (Semantisches Bidirektionales KI-Matching), der offenen Spezifikation aus dem Sage-Protokol; sein Prüfkern ist das Sage-Modul 25, unverändert übernommen. Er ist selbst ein Knoten: eigene signierte Spore, eigene Kennung, und mit dem Netz verbindet er sich nur auf ausdrücklichen Klick. WAS ER TUT: ein Postfach im Browser mit Eingefügt, Entwürfen, KI-Antworten und Exportiert; zwei Wege hinaus, gleichrangig — kopieren für das eigene KI-Abo oder direkt senden mit eigenem Schlüssel; die Ansicht zeigt genau den Text, den die KI sieht. Eine Abschirmung hält Schreib-Helfer und die KI-Schreibhilfe des Browsers von den Schreibfeldern fern und meldet, wenn etwas Fremdes in der Seite mitliest. WAS ER NICHT IST: kein Virenscanner, kein Mail-Programm, und Namen findet er nicht selbst, sondern nur die, die in Von und An stehen oder eingetragen werden. Die Mails bleiben im Browser des Geräts. FÜR WEN: für Leute, die eine KI beim Schreiben nutzen wollen, ohne die Daten ihrer Kunden, Kollegen oder Familie weiterzugeben.",
    domainKeywords: ["SBKIM", "SBKIM-Protokoll", "Sage-Protokol", "Mycel", "Knoten", "Sende-Prüfer", "E-Mail", "KI", "Datenschutz", "Pseudonymisierung", "Platzhalter", "personenbezogene Daten", "Mailadresse", "Telefonnummer", "IBAN", "Rechnungsnummer", "Zugangsschlüssel", "vor dem Senden prüfen", "KI-Abo", "offline", "Daten bleiben auf dem Gerät", "Abschirmung", "Schreib-Helfer", "Werkzeug"],
    stammCategories: ["E-Mail", "Datenschutz", "KI-Werkzeug"],
    guestCategories: ["Befund", "Platzhalter", "Siegel"],
    backupPrefix: "sende-pruefer-backup",
  };
})();

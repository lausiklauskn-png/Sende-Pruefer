/* Gemeinsamer Teil beider Vorschauen: erfundene Beispiel-Mails und die Rechnung
   über Sage-Modul 25 (oben in der Seite eingebunden, byte-gleich mit dem
   Sende-Prüfer). Alle Namen, Adressen und Nummern sind erfunden. */
const P = window.SbkimPseudonym;
const ORDNER = [
  { id: "eingang", name: "Eingefügt", hin: "Mails, die Sie beantworten wollen" },
  { id: "entwurf", name: "Entwürfe", hin: "Was Sie selbst schreiben" },
  { id: "antwort", name: "KI-Antworten", hin: "Zurück, mit echten Angaben" },
  { id: "export", name: "Exportiert", hin: "Als .eml gespeichert oder geteilt" },
];
const MAILS = [
  { id: 1, ordner: "eingang", von: "Petra Beispiel", adr: "petra.beispiel@musterbau.example", betreff: "Rechnung RE-2026-04871 noch offen", zeit: "09:12", neu: true,
    namen: ["Petra Beispiel", "Musterbau GmbH", "Beispiel"],
    text: "Hallo zusammen,\n\ndie Musterbau GmbH hat unsere Rechnung RE-2026-04871 über 1.248,50 EUR noch nicht bezahlt. Überwiesen werden soll auf DE89 3704 0044 0532 0130 00. Frau Beispiel ist unter +49 170 1234567 erreichbar.\n\nBitte um eine freundliche Zahlungserinnerung.\n\nPetra Beispiel",
    antwort: "Sehr geehrte Frau ⟦NAME-3⟧,\n\nunsere Rechnung ⟦RECHNUNG-1⟧ über ⟦BETRAG-1⟧ ist noch offen. Wir bitten Sie, den Betrag in den nächsten sieben Tagen auf ⟦IBAN-1⟧ zu überweisen.\n\nBei Fragen rufen Sie uns gern an.\n\nMit freundlichen Grüßen" },
  { id: 2, ordner: "eingang", von: "Jonas Beispielmann", adr: "j.beispielmann@holzwurm.example", betreff: "Anfrage Beschriftung Transporter", zeit: "Gestern", neu: true,
    namen: ["Jonas Beispielmann", "Tischlerei Holzwurm"],
    text: "Guten Tag,\n\nwir von der Tischlerei Holzwurm möchten zwei Transporter beschriften lassen, Logo und Telefonnummer auf beiden Seiten. Ihr letztes Angebot lag bei 2.380,00 EUR. Geht das bis Ende Oktober?\n\nRückruf gern unter +49 151 7654321.\n\nViele Grüße\nJonas Beispielmann",
    antwort: "Guten Tag ⟦NAME-1⟧,\n\nvielen Dank für Ihre Anfrage. Die Beschriftung beider Transporter schaffen wir bis Ende Oktober. Der Preis von ⟦BETRAG-1⟧ gilt weiterhin.\n\nIch rufe Sie morgen unter ⟦TELEFON-1⟧ an, um einen Termin zu vereinbaren.\n\nMit freundlichen Grüßen" },
  { id: 3, ordner: "entwurf", von: "An: Druckerei Mustermann", adr: "info@druck-mustermann.example", betreff: "Lieferadresse für Auftrag A-7781", zeit: "Mo.", neu: false,
    namen: ["Druckerei Mustermann", "Eva Muster"],
    text: "Hallo,\n\nbitte liefern Sie Auftrag A-7781 nicht an uns, sondern direkt an Eva Muster, Tel. +49 30 1234567, eva.muster@beispiel.example.\n\nDanke und Gruß",
    antwort: "" },
  { id: 4, ordner: "antwort", von: "An: Sabine Probe", adr: "s.probe@studio.example", betreff: "Re: Termin Schaufenster", zeit: "28.9.", neu: false,
    namen: ["Sabine Probe"], text: "Sehr geehrte Frau Probe,\n\nden Termin am Donnerstag bestätigen wir gern.\n\nMit freundlichen Grüßen", antwort: "" },
  { id: 5, ordner: "export", von: "An: Kfz Beispiel", adr: "werkstatt@kfz-beispiel.example", betreff: "Re: Folierung Motorhaube", zeit: "25.9.", neu: false,
    namen: [], text: "Guten Tag,\n\ndie Folierung ist fertig und kann abgeholt werden.\n\nViele Grüße", antwort: "" },
];

function ganzeMail(m) { return "Von: " + m.von + " <" + m.adr + ">\nBetreff: " + m.betreff + "\n\n" + m.text; }
function pruefe(m) { return P.pseudonymize(ganzeMail(m), { values: m.namen }); }

/* Text in Stücke zerlegen: normal, Fund (Original) oder Platzhalter (KI-Fassung). */
function stueckeOriginal(text, funde) {
  const out = []; let pos = 0;
  for (const f of funde) { if (f.start > pos) out.push({ t: text.slice(pos, f.start) }); out.push({ t: f.value, sorte: f.type, token: f.token }); pos = f.end; }
  if (pos < text.length) out.push({ t: text.slice(pos) });
  return out;
}
function stueckeVerdeckt(text) {
  const out = []; const re = /⟦([A-ZÄÖÜ]+)-(\d+)⟧/g; let pos = 0, m;
  while ((m = re.exec(text))) { if (m.index > pos) out.push({ t: text.slice(pos, m.index) }); out.push({ t: m[0], sorte: m[1], token: m[0] }); pos = re.lastIndex; }
  if (pos < text.length) out.push({ t: text.slice(pos) });
  return out;
}
const SORTE_NAME = { NAME: "Name", MAIL: "E-Mail", TELEFON: "Telefon", IBAN: "IBAN", BETRAG: "Betrag", RECHNUNG: "Rechnung", SCHLUESSEL: "Schlüssel" };

function emlText(m, koerper) {
  const betreff = m.betreff.startsWith("Re:") ? m.betreff : "Re: " + m.betreff;
  return "To: " + m.adr + "\r\nSubject: " + betreff + "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nX-Unsent: 1\r\n\r\n" + koerper;
}
async function kopiere(text, knopf) {
  try { await navigator.clipboard.writeText(text); knopf.textContent = "Kopiert"; }
  catch (e) { knopf.textContent = "Bitte markieren und kopieren"; }
  setTimeout(() => { knopf.textContent = knopf.dataset.label; }, 2200);
}

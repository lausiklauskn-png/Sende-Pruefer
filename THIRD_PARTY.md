# Mitgelieferte Fremd-Bibliotheken

| Datei | Was | Lizenz | Herkunft |
|---|---|---|---|
| `vendor/pdfjs/pdf.min.js`, `vendor/pdfjs/pdf.worker.min.js` | PDF.js 3.11.174, Mozilla Foundation | Apache License 2.0 | byte-gleich aus Workflow PDF (`vendor/pdfjs/`), dort aus Mein-WorkFloh |
| `tests/vendor/pdf-lib.min.js` | pdf-lib 1.17.1, Andrew Dillon — **nur für die Proben **, wird nicht ausgeliefert | MIT | byte-gleich aus Workflow PDF (`vendor/pdf-lib.min.js`), npm-Paket `pdf-lib@1.17.1` |

Die Lizenzköpfe in den Dateien bleiben erhalten.
Lizenztexte: <https://www.apache.org/licenses/LICENSE-2.0> · <https://opensource.org/license/mit/>

⚠ pdf.js 3.x konnte mit einer präparierten Schrift eigenen Code ausführen
(CVE-2024-4367). Der Prüfer betreibt es mit `isEvalSupported: false`; ein
Wächter in `tests/anhaenge.mjs` besteht darauf, dass die Kopie aus dem
Auslieferungsprüfer (`assets/pruefer-anhang.js`, SHA-gepinnt) sie trägt.

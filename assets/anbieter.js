/* DIE GESCHLOSSENE LISTE DER ANBIETER (Klaus 2026-09-29: „die Anzahl der
   KI-Anbieter erweitern … Mistral ganz weit unten").
   Ein freies Adressfeld gibt es nicht: wer eine Adresse eintippen kann, kann
   den Text irgendwohin schicken. Wer einen Anbieter ergänzt, trägt ihn HIER
   ein. Die Reihenfolge ist die Reihenfolge in der Auswahl.

   Was belegt ist und was nicht (Stand 2026-09-29):
   - Claude: an Klaus' Tablet gesendet und Antwort erhalten.
   - Mistral: Adresse angenommen; Senden scheiterte an Klaus' Konto (429).
   - Gemini: die Vorabfrage des Browsers (CORS) aus dem Behälter geprüft —
     Aufrufe von github.io werden angenommen. Gesendet hat noch niemand.
   - ChatGPT, OpenRouter: aus dem Behälter nicht erreichbar, NICHT geprüft.
     Adressen und Modelle nach den Unterlagen der Anbieter, wie sie mir
     bekannt sind. Scheitert der erste Aufruf, nennt die Seite den Grund.
   `grenze` ist der Name des Feldes für die Antwortlänge: die neueren
   OpenAI-Modelle lehnen max_tokens ab und verlangen max_completion_tokens. */
(function () {
  "use strict";
  var f = Object.freeze;
  window.SPAnbieter = f({
    anthropic: f({ name: "Claude (Anthropic)", adresse: "https://api.anthropic.com/v1/messages",
      modell: "claude-opus-5", beginnt: "sk-ant-", protokoll: "messages",
      holen: "https://console.anthropic.com/settings/keys" }),
    openai: f({ name: "ChatGPT (OpenAI)", adresse: "https://api.openai.com/v1/chat/completions",
      modell: "gpt-5-mini", beginnt: "sk-", protokoll: "openai", grenze: "max_completion_tokens",
      holen: "https://platform.openai.com/api-keys" }),
    gemini: f({ name: "Gemini (Google)", adresse: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      modell: "gemini-2.5-flash", beginnt: "AIza", protokoll: "openai",
      holen: "https://aistudio.google.com/apikey" }),
    openrouter: f({ name: "OpenRouter (viele Modelle)", adresse: "https://openrouter.ai/api/v1/chat/completions",
      modell: "openrouter/auto", beginnt: "sk-or-", protokoll: "openai",
      holen: "https://openrouter.ai/keys" }),
    mistral: f({ name: "Mistral (EU)", adresse: "https://api.mistral.ai/v1/chat/completions",
      modell: "mistral-small-latest", beginnt: null, protokoll: "openai",
      holen: "https://console.mistral.ai/api-keys" })
  });
})();

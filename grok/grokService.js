// grok/grokService.js
const fetch = require('node-fetch');
const path = require('path');
const logger = require(path.resolve(__dirname, '../utils/logger.js'));

const GROK_API_KEY = process.env.GROK_API_KEY;

async function completar(prompt, options = {}) {
  try {
    if (!GROK_API_KEY) {
      logger.error("grok", "Falta GROK_API_KEY.");
      throw new Error("Falta GROK_API_KEY.");
    }
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      logger.error("grok", "Prompt inválido.");
      throw new Error("Prompt inválido.");
    }

    const { maxTokens = 512, temperature = 0.95 } = options;
    logger.info("grok", "Enviando a Grok:", { prompt: prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://api.x.ai/v1/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "grok-3", prompt, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Error: ${response.status}`);

    const data = await response.json();
    return data.choices?.[0]?.text?.trim() || "(sin respuesta)";
  } catch (error) {
    logger.error("grok", "Error:", error.message);
    throw error;
  }
}

module.exports = { completar };
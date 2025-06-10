// grok/grokService.js
const fetch = require('node-fetch');
const path = require('path');
const logger = require(path.join(process.cwd(), 'utils', 'logger.js'));

const GROK_API_KEY = process.env.GROK_API_KEY;

async function completar(prompt, options = {}) {
  try {
    if (!GROK_API_KEY) {
      logger.error("grok", "Falta la variable de entorno GROK_API_KEY.");
      throw new Error("Falta la variable de entorno GROK_API_KEY.");
    }

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      logger.error("grok", "El prompt debe ser una cadena no vacía.");
      throw new Error("El prompt debe ser una cadena no vacía.");
    }

    const { maxTokens = 512, temperature = 0.95 } = options;

    logger.info("grok", "Enviando prompt a Grok:", { prompt: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '') });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

    const response = await fetch("https://api.x.ai/v1/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        prompt,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("grok", `Grok API error: ${response.status} - ${errorText}`);
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      logger.warn("grok", "No se recibieron respuestas válidas de Grok.");
      return "(sin respuesta)";
    }

    return data.choices[0].text?.trim() || "(sin respuesta)";
  } catch (error) {
    logger.error("grok", "Error en grokService:", error.message, error.stack);
    throw error;
  }
}

module.exports = { completar };
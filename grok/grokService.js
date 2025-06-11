const dotenv = require('dotenv');
const logger = require('../utils/logger.js');
const fetch = require('node-fetch');

dotenv.config({ path: '.env.local' });

// Asegúrate de que las variables de entorno necesarias estén configuradas
function validateEnvVars() {
  const requiredEnv = ['NOTION_API_KEY', 'GROK_API_KEY', 'VERCEL_AUTOMATION_BYPASS_SECRET'];
  const missing = requiredEnv.filter(env => !process.env[env]);

  if (missing.length > 0) {
    logger.error("envValidator", `Faltan variables de entorno: ${missing.join(', ')}`);
    throw new Error(`Faltan: ${missing.join(', ')}`);
  }
}

// Función para verificar si el bypass de automatización está activado
function checkAutomationBypass(secret) {
  return secret === process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

// Completar el prompt con Grok
async function completar(prompt) {
  const apiKey = process.env.GROK_API_KEY;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();

    if (data.error) {
      logger.error("grokService", `Error al completar el prompt: ${data.error}`);
      throw new Error(data.error);
    }

    return data.response; // Suponiendo que la respuesta de Grok esté en 'response'
  } catch (error) {
    logger.error("grokService", `Error al realizar la solicitud: ${error.message}`);
    throw new Error(`Error al conectar con Grok: ${error.message}`);
  }
}

module.exports = {
  validateEnvVars,
  checkAutomationBypass,
  completar
};

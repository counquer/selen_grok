// config/envValidator.js
const path = require('path');
const logger = require(path.resolve(__dirname, '../utils/logger.js'));

require('dotenv').config();

function validateEnvVars() {
  const requiredVars = [
    'NOTION_API_KEY',
    'GROK_API_KEY',
    'VERCEL_AUTOMATION_BYPASS_SECRET',
    'DB_TRIGGERS',
    'DB_MEMORIA_CURADA',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.error('env', `Faltan variables de entorno: ${missing.join(', ')}`);
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

function checkAutomationBypass(headerValue) {
  return headerValue === process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

const isLocal = process.env.VERCEL !== '1';
const isVercel = process.env.VERCEL === '1';

module.exports = { validateEnvVars, checkAutomationBypass, isLocal, isVercel };
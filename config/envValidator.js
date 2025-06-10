const logger = require('../utils/logger.js'); 
function validateEnvVars() { 
  const requiredEnv = ['NOTION_API_KEY', 'GROK_API_KEY', 'VERCEL_AUTOMATION_BYPASS_SECRET', 'DB_TRIGGERS', 'DB_MEMORIA_CURADA']; 
  const missing = requiredEnv.filter(env =
  if (missing.length  throw new Error(`Faltan: ${missing.join(', ')}`); 
} 
function checkAutomationBypass(secret) { 
  return secret === process.env.VERCEL_AUTOMATION_BYPASS_SECRET; 
} 
module.exports = { validateEnvVars, checkAutomationBypass }; 

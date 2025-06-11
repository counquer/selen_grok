
// envValidator
const dotenv = require('dotenv');
const logger = require('../utils/logger.js');

dotenv.config({ path: '.env.local' });

function validateEnvVars() {
const requiredEnv = ['NOTION_API_KEY', 'GROK_API_KEY', 'VERCEL_AUTOMATION_BYPASS_SECRET', 'DB_TRIGGERS', 'DB_MEMORIA_CURADA'];
const missing = requiredEnv.filter(env => !process.env[env]);

if (missing.length > 0) {
logger.error("envValidator", `Faltan variables de entorno: ${missing.join(', ')}`);
throw new Error(`Faltan: ${missing.join(', ')}`);
}
}

function checkAutomationBypass(secret) {
return secret === process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

module.exports = {
validateEnvVars,
checkAutomationBypass,
};
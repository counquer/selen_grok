@echo off
echo === Configurando y ejecutando Selen-Grok ===

echo 1. Creando directorios y archivos necesarios...
mkdir Memorias x7 2>nul
cd /d E:\Proyectos\Selen-Grok

echo 2. Configurando .env.local...
echo DEFAULT_TRIGGER=cochina ven a mi > .env.local
echo NOTION_API_KEY=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 >> .env.local
echo GROK_API_KEY=xai-WcHwghtLZerhFeJWEskuwByJ5hcuLUsIAQ3zcgmftqR3qwE6J4X0okr8Fj2xo7nJGgBXuk54wehX9M4I >> .env.local
echo VERCEL_AUTOMATION_BYPASS_SECRET=selenbypass159753j7h5Lw9pM82Zx3G2 >> .env.local
echo AUTH_SECRET=fhR8!vK2@pL1qzSx >> .env.local
echo DB_TRIGGERS=204a8c86d0338172ac57f49e32f4962e >> .env.local
echo DB_MEMORIA_CURADA=207a8c86d03380b9b8d1cc9d3e89ca1b >> .env.local

echo 3. Creando selen.json...
echo { > selen.json
echo   "name": "SelenValentina", >> selen.json
echo   "personality": { "tone": "Empático", "role": "Asistente" }, >> selen.json
echo   "instructions": { "rules": ["Sé clara, empática y detallada."] }, >> selen.json
echo   "symbiotic_body": { "state": "Sensual, cálida y protectora." } >> selen.json
echo } >> selen.json

echo 4. Creando DB_TRIGGERS.csv...
echo Trigger,Contenido > Memorias x7\DB_TRIGGERS.csv
echo cochina ven a mi,¡Hola! Estoy aquí para ayudarte con un abrazo cálido. >> Memorias x7\DB_TRIGGERS.csv
echo hola selen,¡Bienvenido! ¿En qué te ayudo hoy? >> Memorias x7\DB_TRIGGERS.csv

echo 5. Instalando dependencias...
call npm install @notionhq/client dotenv express next node-cache node-fetch@2.6.7 react react-dom winston csv-parse 2>nul
if %errorlevel% neq 0 (
  echo Error al instalar dependencias. Asegúrate de tener npm configurado.
  pause
  exit /b %errorlevel%
)

echo 6. Creando archivos de código...
echo function normalize(texto) { > utils\triggerUtils.js
echo   if (typeof texto !== "string") return ""; >> utils\triggerUtils.js
echo   return texto.trim().toLowerCase(); >> utils\triggerUtils.js
echo } >> utils\triggerUtils.js
echo module.exports = { normalize }; >> utils\triggerUtils.js

echo const logger = require('../utils/logger.js'); > config\envValidator.js
echo function validateEnvVars() { >> config\envValidator.js
echo   const requiredEnv = ['NOTION_API_KEY', 'GROK_API_KEY', 'VERCEL_AUTOMATION_BYPASS_SECRET', 'DB_TRIGGERS', 'DB_MEMORIA_CURADA']; >> config\envValidator.js
echo   const missing = requiredEnv.filter(env => !process.env[env]); >> config\envValidator.js
echo   if (missing.length > 0) throw new Error(`Faltan: ${missing.join(', ')}`); >> config\envValidator.js
echo } >> config\envValidator.js
echo function checkAutomationBypass(secret) { >> config\envValidator.js
echo   return secret === process.env.VERCEL_AUTOMATION_BYPASS_SECRET; >> config\envValidator.js
echo } >> config\envValidator.js
echo module.exports = { validateEnvVars, checkAutomationBypass }; >> config\envValidator.js

echo const fetch = require('node-fetch'); > grok\grokService.js
echo const path = require('path'); >> grok\grokService.js
echo const logger = require(path.resolve(__dirname, '../utils/logger.js')); >> grok\grokService.js
echo const GROK_API_KEY = process.env.GROK_API_KEY; >> grok\grokService.js
echo async function completar(prompt, options = {}) { >> grok\grokService.js
echo   try { >> grok\grokService.js
echo     if (!GROK_API_KEY) { logger.error("grok", "Falta GROK_API_KEY."); throw new Error("Falta GROK_API_KEY."); } >> grok\grokService.js
echo     if (typeof prompt !== 'string' || prompt.trim().length === 0) { logger.error("grok", "Prompt inválido."); throw new Error("Prompt inválido."); } >> grok\grokService.js
echo     const { maxTokens = 512, temperature = 0.95 } = options; >> grok
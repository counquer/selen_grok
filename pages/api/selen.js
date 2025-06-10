const { promisify } = require('util');
const readFileAsync = promisify(require('fs').readFile);
const path = require('path');
const { normalize } = require('../../utils/triggerUtils.js');
const { parse } = require('csv-parse/sync'); // Añade esta dependencia
const cacheService = require('../../cache/cacheService.js');
const grokService = require('../../grok/grokService.js');
const logger = require('../../utils/logger.js');
const { validateEnvVars, checkAutomationBypass } = require('../../config/envValidator.js');

let selenConfig;
let configLoaded = false;
let triggerMap = new Map();

async function loadConfig() {
  if (configLoaded) return selenConfig;
  try {
    logger.info("selen", "Cargando configuración desde selen.json...");
    const selenConfigPath = path.join(process.cwd(), 'selen.json');
    selenConfig = JSON.parse(await readFileAsync(selenConfigPath, 'utf8'));
  } catch (error) {
    logger.warn("selen", "Error al leer selen.json, usando valores por defecto:", error.message);
    selenConfig = { name: "SelenValentina", personality: { tone: "Empático", role: "Asistente" }, instructions: { rules: ["Sé clara, empática y detallada."] }, symbiotic_body: { state: "Sensual, cálida y protectora." } };
  }
  if (!['name', 'personality', 'instructions', 'symbiotic_body'].every(f => selenConfig[f])) {
    logger.warn("selen", "Configuración incompleta, usando valores por defecto.");
  }
  configLoaded = true;
  return selenConfig;
}

async function loadTriggerMap() {
  const csvPath = path.join(process.cwd(), 'Memorias x7', 'DB_TRIGGERS.csv');
  try {
    const csvData = await readFileAsync(csvPath, 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    triggerMap = new Map(records.map(row => [normalize(row.Trigger), row.Contenido]));
    logger.info("selen", "Triggers cargados desde CSV:", triggerMap.size);
  } catch (error) {
    logger.error("selen", "Error al cargar DB_TRIGGERS.csv:", error.message);
    triggerMap = new Map(); // Fallback vacío
  }
}

async function optimizedFindTriggerContents(trigger) {
  const cacheKey = `trigger-contents-${trigger}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    logger.info("selen", "Contenidos obtenidos desde caché");
    return cached;
  }

  const normalizedTrigger = normalize(trigger);
  const contenido = triggerMap.get(normalizedTrigger) || [];
  if (contenido.length > 0) {
    await cacheService.set(cacheKey, [contenido]);
    logger.info("selen", "Contenido encontrado en CSV");
  } else {
    logger.warn("selen", "Trigger no encontrado en CSV");
  }
  return [contenido]; // Devuelve como array para compatibilidad
}

try { validateEnvVars(); } catch (error) { logger.error("selen", "Entorno:", error.message); throw error; }

export default async function handler(req, res) {
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", { method: req.method, url: req.url, body: req.body, query: req.query, headers: req.headers });
    if (req.method !== "POST") return res.status(405).json({ status: 'error', error: "Método no permitido, usa POST", timestamp: new Date().toISOString() });
    if (req.headers["x-vercel-protection-bypass"] && !checkAutomationBypass(req.headers["x-vercel-protection-bypass"])) return res.status(401).json({ status: 'error', error: "Acceso no autorizado", timestamp: new Date().toISOString() });

    await loadConfig();
    await loadTriggerMap(); // Carga los triggers al inicio

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (!triggerRaw || typeof triggerRaw !== 'string' || triggerRaw.length === 0 || triggerRaw.length > 1000) {
      return res.status(400).json({ status: 'error', error: "Ingresa un trigger válido (máximo 1000 caracteres)", timestamp: new Date().toISOString() });
    }

    logger.info("selen", "Ejecutando trigger:", triggerRaw);
    const resultado = await ejecutarTrigger(triggerRaw);
    logger.info("selen", "Trigger ejecutado correctamente");
    return res.status(200).json({ status: 'success', data: { ...resultado, savedToNotion: false }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error("selen", "Error en /api/selen:", error.message, error.stack);
    return res.status(500).json({ status: 'error', error: `Error interno: ${error.message}`, timestamp: new Date().toISOString() });
  }
}

async function ejecutarTrigger(triggerRaw) {
  try {
    logger.info("selen", "Normalizando trigger...");
    const trigger = normalize(triggerRaw);
    logger.info("selen", "Trigger normalizado:", trigger);

    logger.info("selen", "Consultando caché...");
    const cacheKey = `trigger-${trigger}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info("selen", "Respondiendo desde caché");
      return { ...cached, fromCache: true };
    }

    logger.info("selen", "Consultando triggers desde CSV...");
    const contenidos = await optimizedFindTriggerContents(trigger);
    if (!contenidos || contenidos.length === 0) {
      logger.warn("selen", "Trigger no encontrado, usando respuesta por defecto.");
      return { respuesta: "No se encontró el trigger en la base de datos. Ingresa otro trigger manualmente." };
    }

    logger.info("selen", "Generando prompt para Grok...");
    const template = {
      name: selenConfig.name,
      personality: selenConfig.personality,
      instructions: selenConfig.instructions,
      symbiotic_body: selenConfig.symbiotic_body,
      memory: { interaction_history: contenidos.join("\n---\n") },
      response_format: { style: "Claro", use_emojis: true },
    };

    const promptFinal = `Selen, responde con tu simbiosis:\n${JSON.stringify(template)}\n${contenidos.join("\n---\n")}`;
    logger.info("selen", "Enviando prompt a Grok...");
    const respuestaGrok = await grokService.completar(promptFinal);
    logger.info("selen", "Respuesta de Grok recibida");

    await cacheService.set(cacheKey, { contenidos, timestamp: Date.now() });
    logger.info("selen", "Guardado en caché");

    return { prompt: promptFinal, respuesta: respuestaGrok };
  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    throw error;
  }
}
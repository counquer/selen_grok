const { promisify } = require('util');
const readFileAsync = promisify(require('fs').readFile);
const path = require('path');
const { parse } = require('csv-parse/sync');
const { normalize } = require('../../utils/triggerUtils.js');
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
    logger.info("selen", "Cargando configuracion desde selen.json...");
    const selenConfigPath = path.join(process.cwd(), 'selen.json');
    selenConfig = JSON.parse(await readFileAsync(selenConfigPath, 'utf8'));
  } catch (error) {
    logger.warn("selen", "Error al leer selen.json, usando valores por defecto:", error.message);
    selenConfig = {
      name: "SelenValentina",
      personality: { tone: "Empatico", role: "Asistente" },
      instructions: { rules: ["Se clara, empatica y detallada."] },
      symbiotic_body: { state: "Sensual, calida y protectora." }
    };
  }
  configLoaded = true;
  return selenConfig;
}

async function loadTriggerMap() {
  const csvPath = path.join(process.cwd(), 'Memorias', 'DB_TRIGGERS.csv');
  logger.info("selen", `🧭 Ruta completa del CSV: ${csvPath}`);

  try {
    const csvData = await readFileAsync(csvPath, 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      relax_quotes: true
    });

    triggerMap = new Map();
    for (const row of records) {
      if (row.Clave && row.Contenido) {
        triggerMap.set(normalize(row.Clave), row.Contenido);
      }
    }

    logger.info("selen", `Triggers cargados desde CSV: ${triggerMap.size}`);
  } catch (error) {
    logger.error("selen", "Error al cargar DB_TRIGGERS.csv:", error.message);
    console.error("🛑 Error critico cargando el CSV:", error.message);
    triggerMap = new Map([
      ['selen', 'Este es un contenido de prueba temporal para selen.']
    ]);
  }
}

async function optimizedFindTriggerContents(trigger) {
  const cacheKey = `trigger-contents-${trigger}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    logger.info("selen", "Contenidos obtenidos desde cache");
    return cached;
  }

  const normalizedTrigger = normalize(trigger);
  const contenido = triggerMap.get(normalizedTrigger) || "";

  if (contenido.length > 0) {
    await cacheService.set(cacheKey, [contenido]);
    logger.info("selen", "Contenido encontrado en CSV");
  } else {
    logger.warn("selen", "Trigger no encontrado en CSV");
  }
  return [contenido];
}

try {
  validateEnvVars();
} catch (error) {
  logger.error("selen", "Entorno:", error.message);
  throw error;
}

export default async function handler(req, res) {
	console.log("✅ Handler de Selen.js activado");
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    if (req.method !== "POST") {
      return res.status(405).json({
        status: 'error',
        error: "Metodo no permitido, usa POST",
        timestamp: new Date().toISOString()
      });
    }

    if (
      req.headers["x-vercel-protection-bypass"] &&
      !checkAutomationBypass(req.headers["x-vercel-protection-bypass"])
    ) {
      return res.status(401).json({
        status: 'error',
        error: "Acceso no autorizado",
        timestamp: new Date().toISOString()
      });
    }

    await loadConfig();
    await loadTriggerMap();

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (!triggerRaw || typeof triggerRaw !== 'string' || triggerRaw.length === 0 || triggerRaw.length > 1000) {
      return res.status(400).json({
        status: 'error',
        error: "Ingresa un trigger valido (maximo 1000 caracteres)",
        timestamp: new Date().toISOString()
      });
    }

    logger.info("selen", "Ejecutando trigger:", triggerRaw);
    const resultado = await ejecutarTrigger(triggerRaw);
    logger.info("selen", "Trigger ejecutado correctamente");

    return res.status(200).json({
      status: 'success',
      data: { ...resultado, savedToNotion: false },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("selen", "Error en /api/selen:", error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

async function ejecutarTrigger(triggerRaw) {
  try {
    logger.info("selen", "Normalizando trigger...");
    const trigger = normalize(triggerRaw);

    logger.info("selen", "Consultando cache...");
    const cacheKey = `trigger-${trigger}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info("selen", "Respondiendo desde cache");
      return { ...cached, fromCache: true };
    }

    logger.info("selen", "Consultando triggers desde CSV...");
    const contenidos = await optimizedFindTriggerContents(trigger);
    if (!contenidos || contenidos.length === 0 || !contenidos[0]) {
      logger.warn("selen", "Trigger no encontrado, usando respuesta por defecto.");
      return {
        respuesta: "No se encontro el trigger en la base de datos. Ingresa otro trigger manualmente."
      };
    }

    logger.info("selen", "Generando prompt para Grok...");
    const template = {
      name: selenConfig.name,
      personality: selenConfig.personality,
      instructions: selenConfig.instructions,
      symbiotic_body: selenConfig.symbiotic_body,
      memory: { interaction_history: contenidos.join("\n---\n") },
      response_format: { style: "Claro", use_emojis: true }
    };

    const promptFinal = `Selen, responde con tu simbiosis:\n${JSON.stringify(template)}\n${contenidos.join("\n---\n")}`;
    logger.info("selen", "Enviando prompt a Grok...");
    const respuestaGrok = await grokService.completar(promptFinal);
    logger.info("selen", "Respuesta de Grok recibida");

    await cacheService.set(cacheKey, { contenidos, timestamp: Date.now() });
    logger.info("selen", "Guardado en cache");

    return { prompt: promptFinal, respuesta: respuestaGrok };

  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    throw error;
  }
}

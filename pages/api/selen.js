const { promisify } = require('util');
const readFileAsync = promisify(require('fs').readFile);
const path = require('path');
const { normalize } = require('../../utils/triggerUtils.js'); // Importaci�n est�tica
const { findTriggerContents, guardarMemoriaCurada } = require('../../notion/notionService.js');
const cacheService = require('../../cache/cacheService.js');
const grokService = require('../../grok/grokService.js');
const logger = require('../../utils/logger.js');
const { validateEnvVars, checkAutomationBypass } = require('../../config/envValidator.js');

// Global configuration cache
let selenConfig;
let configLoaded = false;

async function loadConfig() {
  if (configLoaded) return selenConfig;

  try {
    logger.info("selen", "Cargando configuraci�n desde selen.json...");
    const selenConfigPath = path.join(process.cwd(), 'selen.json');
    try {
      const fileData = await readFileAsync(selenConfigPath, 'utf8');
      selenConfig = JSON.parse(fileData);
    } catch (error) {
      logger.error("selen", "Error al leer o parsear selen.json:", error.message, error.stack);
      selenConfig = {
        name: "SelenValentina",
        personality: { tone: "Emp�tico", role: "Asistente" },
        instructions: { rules: ["S� clara, emp�tica y detallada."] },
        symbiotic_body: { state: "Sensual, c�lida y protectora." },
      };
    }

    const requiredFields = ['name', 'personality', 'instructions', 'symbiotic_body'];
    for (const field of requiredFields) {
      if (!selenConfig[field]) {
        throw new Error(`Falta el campo requerido en selenConfig: ${field}`);
      }
    }

    logger.info("selen", "Configuraci�n cargada correctamente");
    configLoaded = true;
    return selenConfig;
  } catch (error) {
    logger.error("selen", "Error al cargar la configuraci�n:", error.message, error.stack);
    throw error;
  }
}

async function optimizedFindTriggerContents(trigger) {
  const cacheKey = `notion-contents-${trigger}`;
  const cachedContents = await cacheService.get(cacheKey);
  if (cachedContents) {
    logger.info("selen", "Contenidos obtenidos desde cach�");
    return cachedContents;
  }

  const contenidos = await findTriggerContents(trigger);
  if (contenidos && contenidos.length > 0) {
    await cacheService.set(cacheKey, contenidos);
    logger.info("selen", "Contenidos guardados en cach�");
  }

  return contenidos;
}

try {
  logger.info("selen", "Validando variables de entorno...");
  validateEnvVars();
  logger.info("selen", "Variables de entorno validadas correctamente");
} catch (error) {
  logger.error("selen", "Error al validar variables de entorno:", error.message, error.stack);
  throw error;
}

export default async function handler(req, res) {
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });

    if (req.method !== "POST") {
      return res.status(405).json({
        status: 'error',
        error: "M�todo no permitido, usa POST",
        timestamp: new Date().toISOString(),
      });
    }

    const authHeader = req.headers["x-vercel-protection-bypass"];
    if (authHeader && !checkAutomationBypass(authHeader)) {
      return res.status(401).json({
        status: 'error',
        error: "Acceso no autorizado: protecci�n Vercel activa",
        timestamp: new Date().toISOString(),
      });
    }

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (typeof triggerRaw !== 'string' || triggerRaw.length === 0 || triggerRaw.length > 1000) {
      return res.status(400).json({
        status: 'error',
        error: "El campo 'trigger' debe ser una cadena v�lida y no exceder 1000 caracteres",
        timestamp: new Date().toISOString(),
      });
    }

    // Load configuration asynchronously
    await loadConfig();

    logger.info("selen", "Ejecutando trigger...");
    const resultado = await ejecutarTrigger(triggerRaw);
    logger.info("selen", "Trigger ejecutado correctamente");
    return res.status(200).json({
      status: 'success',
      data: { ...resultado, savedToNotion: true },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("selen", "Error en la funci�n /api/selen:", error.message, error.stack);
    console.error("Error detallado:", {
      message: error.message,
      stack: error.stack,
      triggerRaw,
      request: { method: req.method, url: req.url, body: req.body, query: req.query },
    });
    return res.status(500).json({
      status: 'error',
      error: `Error interno del servidor: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
}

async function ejecutarTrigger(triggerRaw) {
  try {
    logger.info("selen", "Normalizando trigger...");
    const trigger = normalize(triggerRaw);
    logger.info("selen", "Trigger recibido normalizado:", trigger);

    logger.info("selen", "Consultando cach�...");
    const cacheKey = `trigger-${trigger}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info("selen", "Respondiendo desde cach�");
      return { ...cached, fromCache: true };
    }

    logger.info("selen", "Consultando Notion...");
    const contenidos = await optimizedFindTriggerContents(trigger);
    if (!contenidos || contenidos.length === 0) {
      throw new Error("No se encontraron memorias con la clave proporcionada.");
    }
    logger.info("selen", "Contenidos obtenidos de Notion:", contenidos.length);

    logger.info("selen", "Generando prompt para Grok...");
    const template = {
      name: selenConfig.name,
      personality: selenConfig.personality,
      instructions: selenConfig.instructions,
      symbiotic_body: selenConfig.symbiotic_body,
      memory: { interaction_history: contenidos.join("\n---\n") },
      response_format: { style: "Claro", use_emojis: true },
    };

    const promptFinal = `Selen, responde con toda tu simbiosis y contexto hist�rico siguiendo este template:\n\n${JSON.stringify(template)}\n\nContenido: ${contenidos.join("\n---\n")}`;
    logger.info("selen", "Enviando prompt a Grok...");
    const respuestaGrok = await grokService.completar(promptFinal);
    logger.info("selen", "Respuesta de Grok recibida");

    logger.info("selen", "Guardando memoria en Notion...");
    await guardarMemoriaCurada({
      clave: trigger,
      seccion: "general",
      contenido: respuestaGrok,
      prioridad: "alta",
      estado: "activo",
      categoria_emocional: "neutral",
      etiquetas: ["autom�tico", "grok"],
      timestamp: new Date().toISOString(),
    });
    logger.info("selen", "Memoria guardada en Notion");

    logger.info("selen", "Guardando en cach�...");
    await cacheService.set(cacheKey, { contenidos, timestamp: Date.now() });
    logger.info("selen", "Guardado en cach�");

    return {
      prompt: promptFinal,
      respuesta: respuestaGrok,
    };

  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    throw error;
  }
}